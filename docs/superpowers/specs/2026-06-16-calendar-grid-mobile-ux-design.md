# Calendar grid sizing + mobile UX overhaul — Design

**Date:** 2026-06-16
**Status:** Approved (pending spec review)

## Problem

Two user-reported issues:

1. **Calendar time grid is too small.** Each hour is 48px tall, so a 30-minute slot is only 24px and there are no visible half-hour lines. Half-hours are hard to target with a mouse or finger.
2. **Mobile UX is poor.** The dashboard/app shell pins a 5-tab navigation bar to the bottom on mobile (in addition to a top hamburger menu). The user wants the bottom bar removed and the overall mobile experience brought up to a good standard.

## Goals

- Make the time grid taller and add visible half-hour gridlines so any half-hour is easy to hit.
- Remove the bottom navigation bar; keep and polish the top hamburger dropdown as the single mobile nav.
- Fix the worst mobile breakage (the event inspector side panel) and make the calendar usable on phones.
- Add end-to-end test coverage (Cypress) for the calendar and mobile flows, since none exists today.

## Non-goals

- No redesign of the desktop sidebar or top bar beyond what mobile cleanup requires.
- No change to snap behavior (`SNAP_MINUTES` 30 / `DRAG_SNAP_MINUTES` 5 stay as-is).
- No new calendar features (recurrence, etc.). Scope is sizing, layout, and mobile.

---

## Workstream 1 — Calendar grid sizing & precision

**Files:** `src/lib/calendar-grid.ts`, `src/components/calendar/time-grid.tsx`

- **`HOUR_HEIGHT` 48 → 64px.** A 30-min slot becomes 32px. Event vertical positioning (`event-layout.ts`) and the 7am auto-scroll-on-mount both derive from `HOUR_HEIGHT`, so they scale automatically — no separate changes needed there.
- **Visible half-hour gridlines.** In `time-grid.tsx`, render a dashed line at the :30 mark of each hour row (1px dashed, `--border-subtle` or lighter). This is the key change that makes half-hours visually targetable.
- **Bigger grab/tap targets.** Resize handle height `h-2 → h-3`; raise the minimum rendered event height so short events stay tappable (currently `Math.max(p.height - 3, 16)` → bump the floor to ~24px).
- The grid stays the same height on desktop and mobile (64px everywhere) — simpler, and verified tappable in both.

**Risks:** Taller rows mean fewer hours visible without scrolling; acceptable, and the 7am auto-scroll keeps the working day in view.

---

## Workstream 2 — Mobile UX

**Files:** `src/components/layout/bottom-nav.tsx` (delete), `src/components/layout/content-shell.tsx`, `src/components/layout/mobile-menu.tsx`, `src/app/(app)/layout.tsx`, `src/components/calendar/calendar-view.tsx`

1. **Remove the bottom nav.**
   - Delete `bottom-nav.tsx` and its usage in `layout.tsx`.
   - In `content-shell.tsx`, drop the `pb-24` mobile bottom padding (and the `md:pb-6` it paired with) that only existed to clear the fixed bottom bar — return to normal padding.

2. **Polish the top hamburger dropdown** (`mobile-menu.tsx`).
   - Group items by life-area (Money / Body / Mind / …) to mirror the desktop sidebar instead of a flat list.
   - Tap rows ≥44px tall.
   - Keep the existing framer-motion spring open/close.

3. **Event inspector → bottom sheet on mobile (biggest fix).**
   - Today, selecting an event sets `marginRight: 336` on the grid and shows a fixed 336px right panel. On a ~375px phone this leaves ~39px of usable grid.
   - Under `md`, render the inspector as a full-width bottom sheet (slide up from the bottom, dismissible) instead of a side margin. At `md` and up, keep the existing side panel unchanged.

4. **Calendar defaults to Day view on phones.**
   - In `calendar-view.tsx`, choose the initial view by viewport: `< md` → `day`, otherwise the current default. The user can still switch to week/month manually.
   - Implement the choice via a small pure helper (`pickDefaultCalendarView(isMobile: boolean)`) so it is unit-testable, plus a client-side viewport check to feed it.

5. **Overflow sweep.**
   - Verify the full-bleed calendar and the dashboard cards grid don't clip or horizontally overflow at ≤375px now that the bottom bar is gone. Fix any fixed widths / non-responsive grids found.

---

## Workstream 3 — End-to-end tests (Cypress)

**New:** `cypress/`, `cypress.config.ts`, `package.json` scripts (`e2e`, `e2e:open`).

- Install Cypress as a dev dependency. Add `cypress.config.ts` with `baseUrl` pointing at the dev/preview server and two viewport profiles: desktop (1280×800) and mobile (`cy.viewport(375, 812)`).
- **Auth:** the app uses NextAuth, so specs must authenticate. Use a seeded test user + a `cy.session`-cached programmatic login (custom `cy.login()` command hitting the credentials flow). Test credentials come from Cypress env vars (`CYPRESS_TEST_EMAIL` / `CYPRESS_TEST_PASSWORD`) — **the user must provision a test account / set these for CI.** Document this in the spec/README.
- **Specs:**
  - `calendar.cy.ts` (desktop): grid renders at the larger height; half-hour lines present; can create/select an event; inspector opens as a side panel.
  - `mobile-nav.cy.ts` (mobile viewport): no bottom nav present; ☰ opens the grouped dropdown; tapping a nav item routes correctly.
  - `mobile-calendar.cy.ts` (mobile viewport): calendar opens in Day view by default; selecting an event opens the bottom sheet (not a 336px side panel); sheet is dismissible.
- E2E runs locally and is **not** added to the lint/build CI gate in this change (avoids needing a live DB + test creds in CI immediately); wiring it into CI is a documented follow-up.

---

## Testing strategy

- **Unit (Vitest):**
  - `calendar-grid` constants/positioning math holds at `HOUR_HEIGHT = 64`.
  - `pickDefaultCalendarView(isMobile)` returns `day` on mobile, current default otherwise.
  - Existing calendar/layout unit tests stay green.
- **E2E (Cypress):** as above.
- **Manual:** narrow viewport (≤375px) — grid tappability incl. half-hours, inspector bottom sheet, nav dropdown, no clipped content.

## Rollout

Two largely independent workstreams (grid sizing vs mobile layout) plus the Cypress harness. Can land as one branch. Lint + build + Vitest must pass before merge (existing CI gate); deploy to Vercel production after the user confirms.
