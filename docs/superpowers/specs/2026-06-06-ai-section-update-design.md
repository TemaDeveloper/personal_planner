# AI Section Update — "Update any section with AI Studio"

**Date:** 2026-06-06
**Status:** Design — pending review
**Branch (to create):** `feat/ai-section-update`
**Builds on:** Editorial Calm redesign (shipped). Related: `redesign_editorial_calm` memory, the `section-template` model, `/api/onboarding/generate`, AI Studio (`src/components/ai/ai-studio.tsx`).

---

## 1. Goal

Let the user **select any section in the app and update it with the AI** from AI Studio — not just create new ones. "Any section" spans three kinds, each with a different (but unified) update behavior:

| Section kind | "Update with AI" means |
|---|---|
| **Custom** (AI-generated, e.g. Water tracker) | AI **rewrites** its fields + layout (it's already pure data) |
| **Built-in** (Work, Gym, Finances, Study, …) | AI **augments** it with extra tracked fields rendered in a generic block; the bespoke core (gas/km, earnings, gym calendar) is untouched |
| **Dashboard** | AI **adds/removes/reorders metric cards** sourced from any section's fields |

**Hard constraint (design driver):** built-in sections are hardcoded React with specialized logic. The AI must **not** rewrite their code. It augments them via a per-user customization layer. This preserves the logic that makes built-ins valuable while still making every section AI-updatable.

**Non-goals:** AI rewriting built-in core widgets/logic; per-entry custom fields on built-in entries (v1 uses day-level section fields — see §4); changing global app behavior.

## 2. User-facing flow

1. Open **AI Studio** → toggle **Update** (vs Create).
2. Pick a section from a dropdown listing **all** sections: enabled built-ins, custom sections, and **Dashboard**.
3. Type the change: *"add a temperature field"*, *"track tips per shift"*, *"add my average sleep to the dashboard"*, *"make this a table and add a notes field"* (custom).
4. AI receives the section's **current schema** + the request, returns a **validated** revised customization.
5. Saved; the page reflects it on next view (added fields start empty; nothing destructive to existing logged data).

## 3. Architecture overview

A single concept — **per-user, per-section customization** — drives all three behaviors, plus the existing template for custom sections.

```
AI Studio (Update mode)
   │  POST /api/ai/update  { sectionKey, prompt }
   ▼
resolve section kind ──┬─ custom:<slug>  → AI rewrites SectionTemplate (fields+layout)  → PATCH template
                       ├─ built-in id    → AI edits SectionCustomization.extraFields     → upsert
                       └─ "dashboard"    → AI edits DashboardMetric[] from metric registry → upsert
```

## 4. Data models (new)

**`SectionCustomization`** — extra fields the AI added to a built-in section.
```
{ userId, sectionKey: string,            // built-in SectionId, e.g. "work" | "gym"
  extraFields: IFieldDefinition[],       // reuse existing field shape (key,label,type,options,required,formula)
  sourcePrompt: string, updatedAt }
// unique index (userId, sectionKey)
```

**`CustomFieldValue`** — values logged for those extra fields. **Day-level** (one value per field per day) so it works uniformly across every built-in without touching their bespoke entry models.
```
{ userId, sectionKey, dateKey: string (yyyy-MM-dd, UTC — reuse gym-date convention),
  fieldKey, value: Mixed, updatedAt }
// unique index (userId, sectionKey, dateKey, fieldKey)
```

**`DashboardMetric`** — a metric card on the dashboard.
```
{ userId, label, sourceKind: "builtin" | "custom-field",
  sectionKey, fieldKey, aggregation: "sum"|"avg"|"latest"|"count",
  period: "week"|"month", order: number }
// indexed by (userId)
```

Custom sections need **no new model** — they already have `SectionTemplate`; AI update PATCHes it.

## 5. The metric registry (for the dashboard)

The AI can't invent SQL. It chooses from a **registry of available metrics**, assembled per user:
- **Built-in computed metrics** — a static catalog of what the dashboard already knows how to compute (e.g. `work.weekEarnings`, `gym.daysThisWeek`, `health.avgSleep`, `study.minutesThisWeek`, …). Each registry entry: `{ key, label, sectionKey, compute }`.
- **User custom fields** — every `SectionCustomization.extraFields` entry becomes a selectable metric (`avg`/`sum`/`latest` over `CustomFieldValue`).

`POST /api/ai/update` for the dashboard passes the registry (labels + keys) to the AI; the AI maps the prompt to a registry key + aggregation, producing a `DashboardMetric`. Unmappable requests return a helpful error ("I can't find a 'sleep' metric — add a sleep field to Health first").

## 6. AI layer

Add to `src/lib/ai.ts`:
- `generateBuiltinFieldUpdate(sectionLabel, currentFields, prompt) → { extraFields }` — constrained to add/edit/remove **extra** fields (never touches core).
- `generateCustomSectionUpdate(currentConfig, prompt) → config` — full revised template config (name/fields/viewType/layoutHtml).
- `generateDashboardMetricUpdate(registry, currentMetrics, prompt) → { metrics }` — selects from registry.

Each returns JSON validated by a zod schema at the API boundary; the model retries/uses a safe fallback on invalid output. All three reuse the existing default-AI plumbing (`generateWithDefaultAI`).

## 7. API (new / changed)

- **`POST /api/ai/update`** (new, unified entry): body `{ sectionKey, prompt }`. Resolves kind, calls the right AI fn, validates, persists (PATCH template / upsert customization / upsert metrics), returns the updated artifact. Auth + ownership enforced.
- **`PATCH /api/sections/templates/[slug]`** (new method on existing route): apply a revised custom-section config.
- **`GET/POST /api/sections/[sectionKey]/custom-fields`** : read field defs + today's values; POST upserts a value (used by the generic render block).
- **`GET /api/dashboard/metrics`** : resolve `DashboardMetric[]` against the registry into `{label,value,sub}` for rendering.

## 8. UI

- **AI Studio** (`ai-studio.tsx`): add Create/Update segmented toggle. Update mode: section `<select>` (built-ins from `useSections().enabledSections` + custom from `customSections` + a "Dashboard" entry), prompt textarea, Update button → `POST /api/ai/update` → toast + `router.refresh()`.
- **Generic custom-fields block** (`src/components/sections/custom-fields.tsx`): given a `sectionKey`, fetches field defs + today's values and renders an "Additional fields" Card with inputs (typed per field) that upsert on change. Dropped into each built-in section page (one line per page).
- **Dashboard**: render `DashboardMetric[]` as a row of editable StatBlock cards above/within the glance area, with an inline "edit metrics" affordance (remove/reorder); AI adds them via AI Studio.

## 9. Edge cases & safety

- **Key collisions:** custom field `key` must not equal a built-in core field; namespace stored values by `sectionKey`+`fieldKey`; AI prompt forbids reserved keys.
- **Destructive edits:** removing an extra field hides it but its `CustomFieldValue`s are retained (soft) so re-adding restores history; removing a dashboard metric just unlists it.
- **Custom-section field removal:** existing entries keep stale keys; the regenerated layout simply ignores them (matches current behavior).
- **AI invalid output:** zod-validate; on failure return a clear error to AI Studio, no mutation.
- **Dates:** custom-field values use the **UTC `yyyy-MM-dd`** convention from `src/lib/gym-date.ts` (avoid the timezone bug class we just fixed).
- **Ownership:** every endpoint checks the section/template belongs to the user.

## 10. Phased build

Each phase ships independently and is testable.

- **Phase 1 — Data + AI + endpoint core:** the three models, the three `ai.ts` functions with zod schemas, and `POST /api/ai/update` (+ template PATCH). Unit-tested with a mocked AI. No UI yet. *Gate: endpoint updates each section kind given a stubbed AI response.*
- **Phase 2 — Custom-fields render layer:** `custom-fields.tsx` + the `/custom-fields` value API, wired into all built-in section pages. *Gate: a manually-seeded extra field renders + logs a value on a built-in page.*
- **Phase 3 — AI Studio Update mode:** the toggle + section picker + prompt, end-to-end against `/api/ai/update`. *Gate: "add a temperature field to Gym" works in the live UI.*
- **Phase 4 — Dashboard metrics:** registry, `/api/dashboard/metrics`, editable metric cards, AI mapping. *Gate: "add average sleep to my dashboard" adds a card.*
- **Phase 5 — Custom-section AI update polish:** ensure custom sections rewrite cleanly via the same Update UI; layout regen reuse.

## 11. Testing

- Unit: zod validation of AI outputs; registry resolution; `CustomFieldValue` upsert keyed by UTC date; aggregation math (sum/avg/latest/count).
- Component: `custom-fields.tsx` renders typed inputs and posts upserts; AI Studio Update mode posts the right payload.
- Integration gate per phase: build + full test suite green; manual check on one built-in, one custom section, and the dashboard.

## 12. Risks

- **Scope:** touches every built-in page (render hook) — mitigated by one shared component + a parallel-agent rollout.
- **AI mapping quality** for the dashboard (prompt → registry key) — mitigated by returning clear "not found" errors and a manual picker fallback.
- **Data model churn:** three new collections — acceptable; all additive, none alter existing models.
