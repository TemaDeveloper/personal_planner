# Calendar Redesign — Design Spec

**Date:** 2026-06-08
**Status:** Approved (design, validated via interactive prototype)
**Scope:** Visual + interaction redesign of the existing calendar section. iOS/Google-Calendar feel: borderless, week-default, slide-in inspector (no popups), drag-to-create/move/resize, inline category management.

---

## Goal

Replace the current calendar UI (boxed grid + modal event editor + modal category manager) with a minimalist, iOS-style design driven by direct manipulation. Keep the existing data model and APIs (events as `CustomEntry`, categories on the `SectionTemplate`), extending only where the new UX requires.

## What stays (no change)

- Data layer: per-user calendar `SectionTemplate` (slug `calendar-<userId>`), events as `CustomEntry` with `title/start/end/allDay/categoryKey`, the `from/to` range entries API, category PATCH on the template, and `src/lib/event-layout.ts` (overlap packing).
- Provisioning: every user already gets a default calendar (registration + layout backfill).

## What changes

A redesigned, mostly-rewritten component layer under `src/components/calendar/`, plus one new data field (`description`) and a display-label fix.

---

## Design decisions (locked in the prototype)

1. **Default view = Week.** (Currently month.)
2. **Borderless / edge-to-edge.** No card frame, border, or rounded container around the grid. Only faint hour lines and a 1px column divider.
3. **Header = Month + Year, not "Calendar".** e.g. `June 2026` — bold month, light-weight muted year, top-left. No "Calendar" title text anywhere.
4. **No "Today" button.** Navigation is the `‹ ›` arrows; today is indicated by the clay date circle. (A keyboard/`T` shortcut may jump to today, optional.)
5. **Segmented view switcher** (Month / Week / Day / Agenda) as an iOS-style pill group (soft background, active pill raised), top-right.
6. **Weekend tint.** Saturday & Sunday columns + headers get a soft cool wash (`rgba(63,107,140,.045)`), weekend day-names cool-muted — reads as off-days but remains fully bookable. Applies in **Week, Day, and Month** views.
7. **Now-line.** Thin clay line with a dot, on today's column, updates each minute.
8. **Event blocks.** Rounded, category-tinted background (~15%), 3px left color bar in the category color, title + time. Hover = subtle lift/shadow.
9. **Overlapping events split side-by-side** (equal-width columns) via `layoutDayEvents`. Already implemented; keep.
10. **Slide-in right inspector — replaces ALL modals.** A 336px panel docked to the right of the calendar. The grid smoothly shifts left (`margin-right`) to make room (≈260ms, `cubic-bezier(.22,.61,.36,1)`); the panel translates in from the right. No overlay/popup anywhere.
11. **Drag-to-create with live preview.** Press-drag vertically in a column → a neutral dashed preview block grows in real time, its **time range updating live**. On release → it commits as a draft and the inspector slides in.
12. **Inspector flow: fill → assign → describe.** Draft block is neutral; choosing a category **recolors the block live**; typing the title updates the block live; a notes/description field below. Save persists; Cancel/close discards an unsaved draft.
13. **Drag-to-move.** Grab an existing event and drag it to another time/day; target column highlights; snaps to 30-min steps; on drop → persist (PATCH).
14. **Drag-to-resize.** A bottom-edge handle changes the end time (30-min snap); on release → persist (PATCH).
15. **Inline add-category.** A `+ New` chip in the inspector reveals an in-panel form (name input + color-swatch picker from `CALENDAR_PALETTE`). Adding persists to the template (PATCH `calendarCategories`) and applies to the current event. No modal.
16. **Display label fix.** The calendar section shows as **"Calendar"** in the sidebar/nav and any header — never the raw `calendar-<userId>` slug. URL may keep the slug.
17. **Column alignment.** Header and scrolling body reserve the same right gutter (`scrollbar-gutter: stable` on both) so day columns line up exactly with the hour grid.
18. **Animations (calm, minimal).** Panel slide ≈260ms ease-out-cubic; event pop-in ≈160ms; hover lift; button press-scale; smooth color transition on recolor. All disabled under `prefers-reduced-motion`.

---

## Data model change

Events gain an optional **`description`** (free text / notes).

- `src/lib/models/custom-entry.ts`: add `description?: string`.
- `src/lib/validations.ts`: `calendarEventSchema` gains `description: z.string().max(2000).optional()`; `validateCalendarEvent` returns it; the entries POST/PATCH persist it.
- No other model changes. Move/resize reuse the existing PATCH (start/end). Add-category reuses the existing template PATCH.

---

## Component architecture (`src/components/calendar/`)

The redesign reorganizes the view layer. Each unit has one responsibility.

| File | Change | Responsibility |
|---|---|---|
| `calendar-view.tsx` | rewrite | Orchestrator: default `view="week"`; data fetch per range; holds the **inspector state** (draft-or-selected event); owns drag interactions' commit (POST/PATCH/DELETE) + optimistic updates; renders header + active view + inspector. No modals. |
| `calendar-header.tsx` | rewrite | `Month Year` label, `‹ ›` nav, segmented switcher. No "Today", no "Calendar". |
| `time-grid.tsx` | rewrite | The week/day hour grid: aligned columns (scrollbar-gutter), weekend tint, hour lines, now-line, **drag-to-create live preview**, **drag-to-move**, **drag-to-resize**, overlap layout via `layoutDayEvents`. Exposes callbacks (`onCreate(draft)`, `onMove(id,start,end,day)`, `onResize(id,end)`, `onSelect(id)`). |
| `week-view.tsx` | rewrite | 7-day wrapper over `time-grid`. |
| `day-view.tsx` | rewrite | 1-day wrapper over `time-grid`. |
| `event-inspector.tsx` | **new** (replaces `event-editor.tsx`) | The slide-in right panel: title input, time row, category chips + inline add-category form, notes textarea, Save/Delete. Pure controlled component with callbacks. |
| `month-view.tsx` | restyle | Borderless, weekend-tinted day cells, today marker, category-colored chips; click day → Day view, click chip → inspector. |
| `agenda-view.tsx` | restyle | Minor: match new typography/colors. |
| `event-chip.tsx` | restyle | New block/chip/row visuals (left color bar, tint, hover). |
| `event-editor.tsx` | **delete** | Superseded by `event-inspector.tsx`. |
| `category-manager.tsx` | **delete** | Add-category folded into the inspector. (Renaming/deleting categories is out of scope for this pass — see Non-Goals.) |

**Modified outside the folder:**
- `src/app/(app)/sections/[slug]/page.tsx` — pass a clean `name="Calendar"` (display label) to `CalendarView`; ensure no slug is rendered as a heading.
- `src/components/layout/app-sidebar.tsx` / app layout — ensure the nav label for the calendar shows "Calendar" (it already maps `template.name` which is "Calendar"; verify and fix if the slug leaks anywhere).
- Model/validations/entries routes for `description` (above).

---

## Interaction & data flow

- **Create:** `time-grid` emits `onCreate({day,start,end})` → `calendar-view` makes a local **draft** event (neutral, unsaved), shows it on the grid, opens the inspector. On **Save** → POST `/entries` (with title/start/end/categoryKey/description); on cancel/close → drop the draft. Validation (existing): title required, end>start, known category.
- **Move/Resize:** `time-grid` emits `onMove`/`onResize` → optimistic local update → PATCH `/entries/[id]`; rollback + toast on error.
- **Assign category / add category:** category click sets `categoryKey` on the draft/selected event (live recolor). `+ New` → PATCH template `calendarCategories` (append), then select the new key. Optimistic; rollback on error.
- **Delete:** inspector Delete → DELETE `/entries/[id]`, close panel.
- **Fetch:** unchanged — `from/to` per visible range; month uses `endOfDay(range.end)` for `to`.

## Error handling

- All mutations optimistic with snapshot rollback + `sonner` toast on failure (existing pattern).
- Drag operations clamp to the grid bounds (no negative times, no past-midnight overflow in a single day).
- Reduced motion: panel/blocks appear without transform animation; drag still works.
- A draft that fails to save stays in the inspector with the error shown; the grid draft persists until saved or cancelled.

## Testing (Vitest)

Keep logic-heavy tests; rendering gets smoke/interaction tests.

1. **`event-layout.ts`** — already covered (overlap packing). No change.
2. **Drag math helpers** — extract pure helpers in `time-grid` (e.g. `hourAtOffset(y, opts)` → snapped hour; `clampRange`) and unit-test snapping/clamping.
3. **`event-inspector.tsx`** — title required blocks save; category select reflected in payload; inline add-category appends and selects; notes captured; Delete fires callback.
4. **`calendar-view.tsx`** — default view is week; create flow produces a POST payload; move/resize produce PATCH payloads (mock fetch); category add produces a template PATCH.
5. **View smoke** — week/day/month/agenda render with a small event set; weekend columns carry the weekend class.
6. **`description`** — validation accepts/omits it; round-trips through POST/PATCH.

---

## Non-Goals (this pass)

- Recurring events, invitations, sharing, external sync (still deferred).
- Renaming/recoloring/deleting existing categories (only **adding** is in scope; full management is a later pass).
- Cross-midnight / multi-day **timed** events spanning day columns (still render on start day).
- Touch-specific drag gestures (mouse/trackpad drag is the target; basic pointer events should still function on touch but aren't tuned).

## Acceptance criteria

- Calendar opens in **Week** view, borderless, with a `Month Year` header and no "Today"/"Calendar" text; weekends tinted; columns aligned to the hour grid.
- Drag on empty grid shows a **live-growing** preview with live time; release opens the **slide-in inspector**; assigning a category recolors live; saving persists the event with title + notes.
- Existing events can be **dragged to move** and **resized**; changes persist.
- **Overlapping events** display side-by-side.
- **`+ New`** adds a category inline (persisted) and applies it; no popups appear anywhere.
- The section shows as **"Calendar"** (no raw slug) in nav/header.
- Reduced-motion users get a static, functional calendar.
- Existing tests pass; new tests pass; `npm run lint`, `npm test`, `npm run build` all clean.
