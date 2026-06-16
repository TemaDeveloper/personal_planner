# Calendar grid + mobile UX overhaul — Design

**Date:** 2026-06-16
**Status:** Approved (pending spec review)

## Problem

User-reported issues, in two themes (calendar polish + mobile UX):

1. **Time grid is too small.** Each hour is 48px tall, so a 30-minute slot is only 24px with no visible half-hour lines — half-hours are hard to target.
2. **Date columns don't line up with the time columns.** The day header, all-day strip, and time-grid body don't share a column system, so they drift horizontally.
3. **No mini month calendar.** Want a Google-Calendar-style mini month on the **left** for quick date navigation, shown only when not creating/editing an event.
4. **No zoom.** Want to zoom the time grid in/out via mouse wheel (with modifier), trackpad pinch, and phone pinch.
5. **Mobile UX is poor.** A 5-tab nav bar is pinned to the bottom (on top of a redundant top hamburger). User wants the bottom bar gone and the overall mobile experience brought up to standard.

## Goals

- Make the time grid taller, with visible half-hour gridlines and properly aligned columns.
- Add a left mini-calendar for navigation, mutually exclusive with the event editor.
- Make the grid zoomable (wheel+modifier / trackpad pinch / touch pinch), clamped and persisted.
- Remove the bottom nav; keep and polish the top dropdown as the single mobile nav.
- Fix the worst mobile breakage (the event inspector) and default the calendar to Day view on phones.
- Add Cypress end-to-end coverage (none exists today).

## Non-goals

- No redesign of the desktop sidebar/top bar beyond mobile cleanup.
- No change to snap behavior (`SNAP_MINUTES` 30 / `DRAG_SNAP_MINUTES` 5 stay).
- No new calendar features (recurrence, invites, etc.).

---

## Workstream 1 — Time grid: sizing, alignment, half-hour lines, zoom

**Files:** `src/lib/calendar-grid.ts`, `src/components/calendar/time-grid.tsx`, `src/components/calendar/week-view.tsx`, `src/components/calendar/all-day-strip.tsx`, `src/components/calendar/day-view.tsx`

### 1a. Default sizing + half-hour lines
- **Default hour height 48 → 64px.** A 30-min slot becomes 32px. Event positioning (`event-layout.ts`) and the 7am auto-scroll derive from the hour height, so they scale automatically.
- **Visible half-hour gridlines** in `time-grid.tsx`: a dashed line at the :30 mark of each hour row (lighter than the solid hour line) so half-hours are visually targetable.
- **Bigger grab targets:** resize handle `h-2 → h-3`; raise the minimum event height floor (~16 → ~24px) so short events stay tappable.

### 1b. Column alignment fix
- **Cause:** the day header (`week-view.tsx`) and the body (`time-grid.tsx`) are CSS grids `56px repeat(n,1fr)` with `scrollbar-gutter:stable`, but the all-day strip (`all-day-strip.tsx`) is **flexbox** (`w-14` + `flex-1`) with **no** gutter reservation. The mismatched layout model + missing gutter makes the rows drift, especially where the body's scrollbar gutter is reserved.
- **Fix:** unify all three rows on one column system. Convert `all-day-strip` to the same CSS grid template `56px repeat(n,1fr)`, and ensure header, all-day strip, and body all reserve the scrollbar gutter identically (same `scrollbar-gutter:stable` / matching right padding). Extract the column template + label width (56px) to a shared constant so the three rows can never diverge again.

### 1c. Zoom
- **Hour height becomes state**, not a constant. Default 64px, clamped to a min/max (≈32–160px), persisted to `localStorage` so it sticks across visits. The constant `HOUR_HEIGHT` stays as the exported default; live height is passed down to the grid.
- **Interactions:**
  - **Desktop:** `Ctrl`/`Cmd` + wheel zooms; plain wheel keeps scrolling. Trackpad pinch emits `wheel` with `ctrlKey=true`, so it works through the same handler. Call `preventDefault()` only when the modifier is held (listener attached as `{ passive: false }`).
  - **Touch:** two-finger pinch zooms; one-finger drag still scrolls. Track two active pointers, derive scale from the distance delta.
  - **Anchor:** zoom around the pointer/pinch-midpoint — keep the time under the cursor fixed by adjusting `scrollTop` after the height change.
- **Testable core:** a pure `clampHourHeight(px)` and a `zoomedHeight(current, factor)` helper (unit-tested); the event-bind glue stays thin.

---

## Workstream 2 — Left mini-calendar rail

**Files:** new `src/components/calendar/mini-calendar.tsx`, `src/components/calendar/calendar-view.tsx`

- A compact month grid on the **left** of the calendar shell, mirroring the existing right-side inspector animation. The shell already animates `marginRight: draft ? 336 : 0`; add a symmetric `marginLeft` and render the mini-calendar in a left rail that is shown only when `!draft`.
- **Mutually exclusive with the editor:** no draft → left rail visible; creating/editing (draft set) → left rail slides out, inspector slides in on the right. Both animate (reuse the `transition-[margin]` pattern).
- **Behavior:** highlights today and the selected date; clicking a date sets `cursor` (and, matching the month view's existing `onSelectDay`, switches to Day view). Has its own prev/next month chevrons independent of the main grid.
- **Mobile:** hidden entirely (`hidden md:block`); navigation on mobile is via the header + day view.
- Pure date-grid construction reuses existing `date-fns` helpers / `monthGridRange`.

---

## Workstream 3 — Mobile UX

**Files:** `src/components/layout/bottom-nav.tsx` (delete), `src/components/layout/content-shell.tsx`, `src/components/layout/mobile-menu.tsx`, `src/app/(app)/layout.tsx`, `src/components/calendar/calendar-view.tsx`

1. **Remove the bottom nav.** Delete `bottom-nav.tsx` and its use in `layout.tsx`. In `content-shell.tsx`, drop the `pb-24 md:pb-6` padding that only existed to clear the fixed bottom bar; restore normal padding.
2. **Polish the top hamburger dropdown** (`mobile-menu.tsx`): group items by life-area (Money / Body / Mind / …) like the desktop sidebar, tap rows ≥44px, keep the framer-motion spring.
3. **Event inspector → bottom sheet on mobile (biggest fix).** Today, selecting an event sets `marginRight:336` + a fixed 336px right panel — on a ~375px phone that leaves ~39px of grid. Under `md`, render the inspector as a full-width, dismissible bottom sheet; at `md`+ keep the side panel. (The left mini-cal margin is desktop-only, so no mobile conflict.)
4. **Calendar defaults to Day view on phones.** In `calendar-view.tsx`, pick the initial view by viewport via a pure helper `pickDefaultCalendarView(isMobile)` (`< md` → `day`), fed by a client-side viewport check. User can still switch.
5. **Overflow sweep.** Verify the full-bleed calendar and dashboard cards grid don't clip / overflow at ≤375px now that the bottom bar is gone; fix any fixed widths / non-responsive grids found.

---

## Workstream 4 — End-to-end tests (Cypress)

**New:** `cypress/`, `cypress.config.ts`, `package.json` scripts (`e2e`, `e2e:open`).

- Install Cypress (dev dep). `cypress.config.ts` with `baseUrl` → dev/preview server and two viewport profiles: desktop (1280×800) and mobile (`cy.viewport(375, 812)`).
- **Auth:** app uses NextAuth, so specs must authenticate. Custom `cy.login()` command (credentials flow) cached via `cy.session`, using a seeded test user. Credentials from `CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD`. **The user must provision a test account / set these env vars** — documented in spec + a short `cypress/README.md`.
- **Specs:**
  - `calendar.cy.ts` (desktop): grid renders at default height; half-hour lines present; header/all-day/body columns align; create + select an event; inspector opens as a side panel; mini-calendar visible when idle and navigates on date click.
  - `calendar-zoom.cy.ts` (desktop): Ctrl+wheel changes row height within clamp; plain wheel still scrolls.
  - `mobile-nav.cy.ts` (mobile): no bottom nav; ☰ opens the grouped dropdown; tapping a nav item routes correctly.
  - `mobile-calendar.cy.ts` (mobile): calendar opens in Day view; selecting an event opens the bottom sheet (not a 336px side panel); sheet dismisses.
- E2E runs **locally**, not added to the lint/build CI gate in this change (would need a live DB + creds in CI). Wiring into CI is a documented follow-up.

---

## Testing strategy

- **Unit (Vitest):** hour-height clamp/zoom helpers; `pickDefaultCalendarView(isMobile)`; mini-calendar date-grid construction; existing calendar/layout tests stay green.
- **E2E (Cypress):** as above.
- **Manual:** narrow viewport (≤375px) — grid tappability incl. half-hours, inspector bottom sheet, nav dropdown, no clipped content; desktop — column alignment, zoom anchoring, mini-cal/editor mutual exclusion.

## Rollout

Four workstreams on one branch (`feat/calendar-grid-mobile-ux`). Lint + build + Vitest must pass before merge (existing CI gate). Deploy to Vercel production after the user confirms.
