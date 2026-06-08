# iOS-Style Calendar Section — Design Spec

**Date:** 2026-06-08
**Status:** Approved (design)
**Scope:** A new `calendar` section view type with timed events, color categories, and four views (Month, Week, Day, Agenda).

---

## Goal

Add an iOS-Calendar-style experience to the planner as a new section **viewType** (`calendar`), plugging into the existing template/section/entry system. Users create **timed events** (and all-day events) organized by named **color categories** ("calendars"), and view them in **Month**, **Week**, **Day**, and **Agenda** views.

## Non-Goals (explicitly out for v1)

- Recurring events (RRULE/daily/weekly), and recurrence exceptions.
- Drag-to-create or drag-to-move/resize events.
- Invitations, attendees, sharing, or external calendar sync (Google/Apple/ICS).
- Timezone handling beyond the browser's local zone.
- Reminders / push notifications.

These are deferred; the data model leaves room for them but the UI does not implement them.

---

## Architecture Overview

The calendar is a new `viewType` on the existing section system, mirroring how `board` and `table` work today:

- Section routing in `src/app/(app)/sections/[slug]/page.tsx` gains a branch: `viewType === "calendar"` → `<CalendarView />`.
- Events are stored as `CustomEntry` documents (the existing per-section entry model), extended with optional calendar fields. This reuses the entries CRUD API, auth, and validation.
- Color **categories** are stored on the `SectionTemplate` (the calendar section's own config).
- All calendar UI lives under `src/components/calendar/`, decomposed into small, independently testable units. The complex hour-grid layout logic is isolated into a pure function so it can be unit-tested without rendering.

### Decision: extend `CustomEntry` (not a new model)

Chosen over a dedicated `CalendarEvent` model because it reuses the entire existing entries pipeline (routes, auth via `resolveUserId`, optimistic client patterns) and fits the "section entries" mental model. The trade-off — a few nullable fields only calendar sections populate — is acceptable.

---

## Data Model

### `CustomEntry` (extend) — `src/lib/models/custom-entry.ts`

Add these **optional** fields (existing fields unchanged):

| Field | Type | Notes |
|---|---|---|
| `title` | `string?` | Event title. Required for calendar events (enforced at API/validation layer, not schema-required, to preserve non-calendar entries). |
| `start` | `Date?` | Event start datetime. For all-day events, set to `startOfDay`. |
| `end` | `Date?` | Event end datetime. For an all-day event, set to `endOfDay` of its last day (a single-day all-day event has `start = startOfDay(d)`, `end = endOfDay(d)`). |
| `allDay` | `boolean?` | True for all-day events. Default `false` when calendar fields present. |
| `categoryKey` | `string?` | References a `calendarCategories[].key` on the template. |

**Compatibility:** `date` (existing, required, `startOfDay`) is always set to `startOfDay(start)` for calendar events so existing date-range queries and indexes keep working. Non-calendar entries are unaffected — they simply never set the new fields.

### `SectionTemplate` (extend) — `src/lib/models/section-template.ts`

- Add `"calendar"` to the `viewType` enum (alongside `weekly-cards`, `table`, `grid`, `board`).
- Add `calendarCategories?: CalendarCategory[]` where:

```ts
type CalendarCategory = {
  key: string;     // stable slug, e.g. "work"
  label: string;   // display, e.g. "Work"
  color: string;   // hex from the fixed palette, e.g. "#3F6B8C"
};
```

When a calendar section is created, it seeds `calendarCategories` with defaults:

```
[
  { key: "personal", label: "Personal", color: "#C0613C" }, // clay  (chart-1)
  { key: "work",     label: "Work",     color: "#3F6B8C" }, // ocean (chart-2)
  { key: "health",   label: "Health",   color: "#5E8C6A" }, // sage  (chart-5)
]
```

### Color palette (fixed)

Category colors are chosen from a fixed palette so they stay theme-coherent. Defined once in `src/lib/calendar.ts`:

```
clay    #C0613C   ocean  #3F6B8C   plum   #7A5C7E
amber   #C99A3B   sage   #5E8C6A   red    #C0524A
teal    #3F8C86   graphite #5C5552
```

The category color picker shows these swatches. Stored value is the hex.

---

## API / Data Flow

### viewType enablement

- `viewType` enum gains `"calendar"` in the model and in the Zod validation for template create/PATCH (`src/lib/validations.ts`), matching the existing `board` allowance.
- A calendar section is created through the normal template-creation path with `viewType: "calendar"`; the create handler seeds default `calendarCategories` when `viewType === "calendar"` and none provided.

### Entries — reuse existing routes, add range query

- `GET /api/sections/[slug]/entries` gains optional `from` and `to` ISO query params. When present, return entries whose `[start, end]` overlaps `[from, to]` (fallback to `date` within range for entries lacking `start`). Existing `weekOf` and `all=1` behavior is preserved.
- `POST /api/sections/[slug]/entries` accepts the new calendar fields. Validation (calendar sections only): `title` non-empty; if `!allDay` then `start` and `end` present and `end > start`; `categoryKey` must exist in the template's `calendarCategories`.
- `PATCH /api/sections/[slug]/entries/[id]` accepts the same fields with the same validation.
- `DELETE` unchanged.

### Category management

- `PATCH /api/sections/templates/[slug]` (existing template PATCH) accepts an updated `calendarCategories` array (add/rename/recolor/delete). On delete of a category, the client first reassigns affected events to a fallback category, then removes it (the API does not cascade — the client orchestrates, keeping the route simple). Validation: keys unique, color in palette, at least one category remains.

### Client fetching

- Each view fetches only its visible window via `from`/`to` (Month: visible month grid range incl. leading/trailing days; Week/Day: that range; Agenda: today → +60 days). Uses the existing `fetch` + `useState`/`useEffect` pattern with optimistic create/update/delete and snapshot rollback on error (matching `custom-entry-form.tsx`).

---

## Components (all under `src/components/calendar/`)

Each file has one responsibility:

| File | Responsibility |
|---|---|
| `calendar-view.tsx` | Top-level orchestrator: holds current date + active view + category list, fetches the visible range, renders header + the active sub-view, owns the event-editor modal. |
| `calendar-header.tsx` | View switcher (Month/Week/Day/Agenda), `‹ Today ›` date navigator, "New event" button, current period label. |
| `month-view.tsx` | Month grid (built on `react-day-picker`, mirroring `dashboard-calendar.tsx`). Day cells show up to 3 colored event chips + "+N more"; click day → switch to Day view; click chip → edit. |
| `time-grid.tsx` | Shared hour-grid engine used by Week and Day. Renders hour rows, an all-day strip, the "now" line, and positioned event blocks. Consumes the layout from `event-layout.ts`. |
| `week-view.tsx` | 7 day-columns; delegates each column's rendering to `time-grid` building blocks. |
| `day-view.tsx` | Single column via the same time-grid engine. |
| `agenda-view.tsx` | Chronological list grouped by day; each row a colored event line. Empty state when no upcoming events. |
| `event-editor.tsx` | Create/edit modal: title, all-day toggle, start/end `datetime-local` pickers (gated by all-day), category swatch picker. Validates `end > start`; delete via `ConfirmDialog`. |
| `category-manager.tsx` | Small UI to add/rename/recolor/delete categories; persists via template PATCH. |
| `event-chip.tsx` | Presentational colored chip/block for an event (used by month + time grid + agenda). |

### Pure logic (no React) — `src/lib/calendar.ts` + `src/lib/event-layout.ts`

- `src/lib/calendar.ts`: the color palette, default categories, date helpers (range for a month grid, etc.), and `categoryColor(categories, key)` lookup with fallback.
- `src/lib/event-layout.ts`: `layoutDayEvents(events, opts)` — pure function that, given timed events for a single day, computes each event's vertical offset/height (from start/end vs. the grid's hour range) and horizontal columns for overlapping events (standard interval-graph column packing). **This is the riskiest logic and is unit-tested thoroughly.**

---

## Views — behavior detail

### Month
- 6-row month grid; leading/trailing days dimmed. Today highlighted.
- Each day shows event chips sorted by start time; all-day events first. Max 3 visible, then "+N more" (opens Day view for that date).
- Click empty area of a day → open editor pre-filled with that date (all-day default). Click a chip → edit that event.

### Week / Day (shared `time-grid`)
- Hour rows 00:00–24:00; container scrolls, initially scrolled to ~07:00.
- All-day events render in a pinned top strip spanning their day(s).
- Timed events render as blocks positioned by start/end; overlapping events share the column width via `layoutDayEvents`.
- A red "now" line at the current time on today's column (updates each minute).
- Week shows 7 columns (week of current date, Mon–Sun per existing `startOfWeek` usage); Day shows 1.
- Click an empty slot → editor pre-filled with that date and the clicked hour as start (+1h end). Click a block → edit.

### Agenda
- Forward window (today → +60 days), events grouped by day with a date sub-header; each row shows time range, colored dot, title, category.
- Empty state (reuse `EmptyState`) with a "New event" CTA when the window has no events.

---

## Error Handling

- API rejects invalid events (missing title, `end <= start`, unknown `categoryKey`) with 400 + message; client surfaces via `sonner` toast and keeps the editor open.
- Optimistic mutations roll back on API error (snapshot pattern).
- Empty ranges render empty states, never spinners-forever.
- Deleting the last category is blocked (API validation + disabled UI).
- All views guard against events with missing/invalid dates (skip + console warn), so one bad record never crashes a view.

---

## Testing (Vitest)

Focus on logic and contracts; rendering gets smoke tests.

1. **`event-layout.ts` (primary):** non-overlapping events get full width; two overlapping events split into 2 columns; three-way overlaps; back-to-back events (end == next start) do **not** overlap; an event spanning the whole day; vertical offset/height match the hour range.
2. **`calendar.ts`:** `categoryColor` returns the category color, falls back for unknown keys; month-grid range includes correct leading/trailing days; palette/default-category invariants.
3. **API validation:** POST/PATCH reject missing title, `end <= start`, and unknown `categoryKey`; accept valid all-day and timed events; `from`/`to` range filter returns only overlapping events. (Unit-test the Zod schema / validation helper directly.)
4. **`event-editor.tsx`:** all-day toggle disables time inputs; submitting with `end <= start` shows an error and does not call the API; category picker selection is reflected in the payload.
5. **View smoke tests:** Month/Week/Day/Agenda each render without crashing given a small event set and show event titles; Agenda shows the empty state with no events.

Tests follow the repo convention (co-located `__tests__/` or `*.test.tsx`, Vitest + Testing Library, `afterEach(cleanup)`).

---

## Files Touched (summary)

**New:**
- `src/components/calendar/calendar-view.tsx`
- `src/components/calendar/calendar-header.tsx`
- `src/components/calendar/month-view.tsx`
- `src/components/calendar/time-grid.tsx`
- `src/components/calendar/week-view.tsx`
- `src/components/calendar/day-view.tsx`
- `src/components/calendar/agenda-view.tsx`
- `src/components/calendar/event-editor.tsx`
- `src/components/calendar/category-manager.tsx`
- `src/components/calendar/event-chip.tsx`
- `src/lib/calendar.ts`
- `src/lib/event-layout.ts`
- Tests for `event-layout`, `calendar`, the entries validation, `event-editor`, and the views.

**Modified:**
- `src/lib/models/custom-entry.ts` — optional calendar fields.
- `src/lib/models/section-template.ts` — `calendar` viewType + `calendarCategories`.
- `src/lib/validations.ts` — Zod for new fields, viewType, categories.
- `src/app/api/sections/[slug]/entries/route.ts` — `from`/`to` range query + accept/validate calendar fields.
- `src/app/api/sections/[slug]/entries/[id]/route.ts` — accept/validate calendar fields on PATCH.
- `src/app/api/sections/templates/route.ts` and `.../templates/[slug]/route.ts` — seed default categories on create; accept `calendarCategories` on PATCH.
- `src/app/(app)/sections/[slug]/page.tsx` — route `viewType === "calendar"` → `<CalendarView />`.

---

## Acceptance Criteria

- A section with `viewType: "calendar"` renders the calendar UI with a working Month/Week/Day/Agenda switcher.
- Users can create, edit, and delete timed and all-day events; events appear in all four views in their category color.
- Overlapping timed events lay out side-by-side without visual overlap in Week/Day.
- Categories can be added, renamed, recolored, and deleted (with reassignment); colors persist and are theme-coherent.
- Validation prevents invalid events (no title, `end <= start`, unknown category).
- Existing non-calendar sections and entries are unaffected; existing tests still pass; new tests pass.
- No recurring-event, drag, sharing, or sync functionality (explicitly deferred).
