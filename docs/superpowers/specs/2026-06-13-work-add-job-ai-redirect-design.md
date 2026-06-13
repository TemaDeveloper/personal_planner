# Add Job In-Section + AI Honest-Redirect — Design

**Date:** 2026-06-13
**Status:** Approved (design)
**Scope:** "A" of a two-part effort. "B" (full AI section add/update overhaul) is a separate future project.

## Problem

A user asked the AI Studio (Update mode) to "add one more job" to the **Work** section. No job was created — an empty input box appeared instead.

**Root cause:** Jobs live in `user.workConfig.jobs` (a built-in feature). The AI Update path for built-in sections (`POST /api/ai/update` → `generateBuiltinFieldUpdate`) is deliberately scoped to manage only **extra custom fields** and is prompted: *"You cannot change the section's built-in features."* So "add one more job" was (mis)interpreted as "add a custom field," producing a junk field rendered as an empty input. There is no code path for the AI to mutate `workConfig.jobs`, and **no in-section UI** to add a job — jobs can only be added in Settings.

## Goals

1. Give Work a direct **"+ Add job"** action in-section (no detour to Settings for the common case).
2. Make the AI **stop fabricating junk fields** for built-in-feature requests; instead return a clear message telling the user where to make the change.

Non-goals (deferred to project "B"): teaching the AI to actually create/edit jobs or other built-in entities; generalized in-section "+" for every section; redesign of AI Studio.

## Part 1 — In-section "+ Add job"

### UI
- `work/page.tsx` stays a server component fetching `jobs`. It renders a new **client** component `AddJobButton` and passes the current jobs (just the shape needed for validation: `{ name }[]`) as a prop.
- `AddJobButton` shows an **"Add job"** button in the `PageHeader` action slot (alongside Export) and is also the empty-state CTA (replacing the "Go to Settings" nudge; Settings remains available for advanced editing).
- Clicking opens a `Modal` (reuse `@/components/ui/modal`, `@/components/ui/button`) with:
  - **Name** — text, required
  - **Hourly rate** — number, default `0`
  - **Weekly target (hours)** — number, default `20`
  - Advanced options (`active`, `enableExpenseTracking`) are **not** in quick-add — new jobs default to `active: true`, `enableExpenseTracking: false`. They remain editable in Settings.

### Persistence
- Reuse `PATCH /api/user/preferences` with body `{ workConfig: { jobs: [...existingJobs, newJob] } }` (the route sets the entire `workConfig.jobs` array; `gasPrice`/`carConsumption` are untouched because they're absent from the body).
- On success: success toast + `router.refresh()` so the new job card renders.

### Validation
- Name required (non-empty after trim).
- Name must be **case-insensitively unique** among existing job names — job detail pages route on `name.toLowerCase()` (`/work/[jobName]`), so a duplicate would collide. On collision, show an inline error and do not submit.
- Extract a pure helper `validateNewJob(existingNames: string[], candidate: { name, hourlyRate, weeklyTarget }): { ok: true, job } | { ok: false, error }` so the rule is unit-testable independent of React.

## Part 2 — AI honest-redirect (model-signaled)

### Prompt
Extend `buildBuiltinFieldPrompt` (`src/lib/ai-section-update.ts`) so the model may return **either**:
- `{ "extraFields": FieldDef[] }` (current behavior, for genuine custom-field requests), **or**
- `{ "unsupported": true, "message": "<short, user-facing explanation>" }` when the request targets a **built-in feature** the AI cannot change (e.g. adding/removing jobs on Work).

The prompt instructs: if the request is about built-in features rather than adding/editing an extra custom field, return the `unsupported` form with a brief message telling the user where to do it instead.

### Schema / parser
- Extend `extraFieldsUpdateSchema` (`src/lib/validations.ts`) to a discriminated/optional shape allowing `{ unsupported: true, message: string }` as an alternative to `{ extraFields }`. `parseExtraFieldsResponse` returns the parsed union.

### Route
- In `POST /api/ai/update` (`src/app/api/ai/update/route.ts`), builtin branch: if the parsed result is `unsupported`, **save nothing** and return `{ kind: "builtin", unsupported: true, message }` with HTTP 200.
- The `message` is produced by the model and passed through verbatim (the route does not rewrite it). The prompt steers it: for Work, *"Adding jobs isn't an AI change — use the + Add job button on the Work page"*; for other built-ins, point to Settings. The route only guarantees a non-empty fallback message if the model omits one.

### AI Studio surfacing
- In `ai-studio.tsx` `handleUpdate`, when the response has `unsupported: true`, show `message` in the existing feedback area (info styling, not a hard error) and do **not** show the generic "Section updated!" success. Keep the modal open so the user can read it.

## Testing
- `validateNewJob` — unit tests: empty name rejected; duplicate (case-insensitive) rejected; valid candidate normalized with defaults.
- `parseExtraFieldsResponse` — unit tests: parses the `extraFields` form; parses the `unsupported` form; rejects malformed JSON.
- (Existing AI/work tests must stay green; run `npm run lint` before pushing — CI gates on lint.)

## Files touched
- `src/app/(app)/work/page.tsx` — render `AddJobButton`, pass jobs.
- `src/components/work/add-job-button.tsx` *(new)* — client button + modal.
- `src/lib/work/validate-new-job.ts` *(new)* — pure validation helper.
- `src/lib/ai-section-update.ts` — extend builtin prompt + parser.
- `src/lib/validations.ts` — extend `extraFieldsUpdateSchema`.
- `src/app/api/ai/update/route.ts` — handle `unsupported`.
- `src/components/ai/ai-studio.tsx` — surface `unsupported` message.
- Tests for the two pure helpers.
