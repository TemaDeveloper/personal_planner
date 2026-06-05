# Editorial Calm — Full App Visual Redesign

**Date:** 2026-06-05
**Status:** Design approved, pending spec review
**Scope:** Full app — replace the current glassmorphism system with a "Swiss Editorial Calm" design language across the token layer, shared primitives, and every page.

---

## 1. Problem

The app's current look reads as "AI-generated slop" despite a technically clean token system (`src/app/globals.css`). The slop signal comes from specific, nameable choices, confirmed by three independent research passes (general web, Reddit designer threads, Anthropic design tooling):

- **Glassmorphism as the default surface.** `surface-card` uses `backdrop-blur` + translucent white on every surface. Universally cited as the #1 over-produced "AI app" look and a documented accessibility failure (low-contrast text). When every surface is frosted, nothing has hierarchy.
- **Default Tailwind/Vercel palette.** Green `#22C55E` brand accent + Plus Jakarta Sans is the template default. Green is also semantically *success* — spending it as the brand accent destroys its most meaningful signal.
- **Uniform card grid, equal-weight tiles.** `DashboardCards` renders every metric in an identical `Card` with identical padding/radius/`glass-lift`. "Amateur UIs are additive; pro UIs are subtractive and tuned." Premium look comes from **hierarchy via extreme size contrast**, not decoration.
- **No tabular figures.** A number-heavy tracker (earnings, hours, L/100km, streaks) with proportional digits → columns jump and misalign. The single clearest amateur tell for data UIs.
- **Motion spent on decoration.** `pulse-glow`, `shimmer`, body radial glow, `accent-glow` — ambient chrome animation instead of state-change feedback.

## 2. Goal

Adopt **"Editorial Calm"** — a Swiss/editorial design language in the lineage of Linear, Notion Calendar, and Things 3: warm neutrals, one rationed accent, extreme typographic hierarchy, tabular numerics, hairline separation, and motion reserved exclusively for state-change feedback. The result should read as *intentionally designed and premium*, age well under daily use, and pass WCAG AA contrast.

Non-goals: no new runtime data features; no information-architecture overhaul beyond what hierarchy requires; no new heavy dependencies (Framer Motion, already installed, covers motion).

## 3. Design System — "Editorial Calm"

### 3.1 Surfaces (kill the glass)
- Glass is **removed as a default**. Permitted in exactly one context: modals/popovers, and even there as **solid background + one soft shadow**, never frosted blur.
- All other surfaces are **flat warm surfaces separated by 1px hairline borders** (8% opacity of foreground). No `backdrop-filter`, no per-card shadow.
- One shadow recipe total, reserved for overlays: `0 16px 48px rgba(0,0,0,0.12)` (light) / heavier in dark.
- **Remove:** `body::before` radial glow, `.accent-glow`, `@keyframes pulse-glow`, `@keyframes shimmer`, `.animate-shimmer`, `.animate-pulse-glow`, and all `--glass-*` tokens.

### 3.2 Color
| Role | Light | Dark | Usage rule |
|------|-------|------|------------|
| Canvas | `#F7F6F3` | `#0F0F0E` | warm, never pure white/black |
| Surface (raised) | `#FFFFFF` | `#1A1A18` | one step from canvas |
| Border (hairline) | `foreground @ 8%` | `foreground @ 10%` | replaces shadows for separation |
| **Brand accent (clay)** | `#C0613C` | `#D2724A` | **primary action + active nav + focus ring ONLY**, sat <80% |
| Text primary | `foreground @ 90%` | — | tiers by opacity, not gray hex |
| Text secondary | `foreground @ 54%` | — | |
| Text tertiary | `foreground @ 36%` | — | |

**Semantic colors are separate from the accent and muted**, used only in data context (small dots, text, thin bars — never large fills):
- On-track / good: `#5E8C6A` (muted sage)
- Behind / warning: `#C99A3B` (amber)
- Over / alert: `#C0563C` (clay-red)

The governing rule: **accent ≠ status.** Clay means "act here." Sage/amber/clay-red mean data states. Neither bleeds into the other's territory. The existing accent-theme switcher (`data-theme`) is reduced or removed — a single disciplined accent is the point; if kept, all presets must be muted, non-purple, single-hue.

### 3.3 Typography
- **One family across all scales: Hanken Grotesk** (UI + numbers). Warm, professional, not Inter/Roboto/Space Grotesk, ships true `tabular-nums`. Loaded via `next/font`. (Alternate if more edge wanted: Mona Sans.)
- **Tabular figures everywhere numeric.** New `.num` utility: `font-variant-numeric: tabular-nums; letter-spacing: -0.01em;`. Applied to every displayed number.
- **Type scale via extreme contrast**, not many middling steps:
  - Hero number: 48–56px / 700 / `-0.03em`
  - Section title: 18–20px / 600 / `-0.01em`
  - Body: 15px / 1.5
  - **Label: 11px / 600 / uppercase / `+0.08em`** (the small partner to every hero number)
- Hierarchy is produced by the *gap* between hero and label (target ≥4:1 size ratio), not by color, borders, or shadows.

### 3.4 Signature element — the "stat block"
One reusable typographic unit is the app's voice everywhere:

```
[ HERO NUMBER ]   ← .num, 48–56px (or smaller per context), 700
[ LABEL ]         ← 11px uppercase +tracking, secondary opacity
[ secondary line ]← optional, muted, e.g. "€39/hr · 31.5h"
```

Implemented as a `<StatBlock>` primitive with size variants (`hero | lg | md | sm`). Used on dashboard, work, gym, study, finances, etc. — at different sizes but identical treatment. This consistency *is* the brand identity (cf. GitHub's contribution graph, Oura's ring). It replaces the current wall of equal glass tiles.

### 3.5 Motion (feedback only)
- Remove all ambient/looping animation.
- Reassign motion to **state changes**, via Framer Motion / CSS, transform+opacity only, 150–250ms, stiff spring:
  - Log session / add earnings → number counts up + brief clay flash
  - Check task → spring scale `0.98 → 1`
  - Habit logged → ring fills (keep `habit-ring-progress`, repurpose)
  - Page/section entrance → one staggered reveal (keep `animate-slide-up`, used sparingly)
- `prefers-reduced-motion` already handled — extend the guard to any new animations.

### 3.6 Density & layout
- Left-aligned, asymmetric. One hero metric per view; supporting stats grouped by proximity (Gestalt); detail behind drill-down.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Radius reduced to `6px` (`--radius: 0.375rem`), down from `0.75rem`.
- Real empty/first-run states (composed, with one clear CTA) replacing bare "No data" text.

## 3A. Information Architecture (UX / flow)

The redesign is **not only visual** — research (Apple HIG, NN/g, Reddit usability threads) identified the IA as the root cause of "I don't understand how to use it." A local clickable prototype (`design-preview/index.html`) validated the following decisions; the user approved the direction.

Governing finding: *users abandon apps when the system becomes the work.* Favor working defaults, one-tap logging, a glanceable "today," and zero maintenance.

**1. Configuration moves in-context (Apple HIG).** The 1,072-line global Settings page is decomposed. Per-section config relocates *into the section it affects*, via a **Setup tab** on that section:
- Work → jobs, hourly rates, weekly targets, gas/km config
- Finances → monthly bills, expense categories
- Study → subjects
- Gym → target days/week
Global **Settings** shrinks to only: Account · Appearance · Regional · AI · Data (export/sharing). "Sections" enable/disable + custom-section management becomes its own lightweight screen (or stays in Settings as a single "Manage sections" entry).

**2. Navigation grouped by life-area (NN/g ≤2 levels; Miller 7±2).** The flat list of up to 13 sections becomes 5 top-level groups with nested items: **Today** (home, pinned) · **Money** (Work, Finances) · **Body** (Gym, Health, Habits) · **Mind** (Study, Reading, Journal, Goals) · **Home** (Housework, Shopping, Meals, Hobbies). Plain labels, active "you are here" state, ≤2 levels.

**3. Dashboard becomes "Today" — an action hub, not a chart wall.** Top-left hero metric (one primary number), a **quick-log chip row**, a today action list (with one-tap done), and a glanceable life-area summary with drill-down. Deep analytics live one level down inside each section.

**4. Global quick-capture.** A persistent **`+` Add** button on every screen + a **`⌘K` command palette** for create + search + jump-to-section, so logging never requires navigating into a module first (Linear/Obsidian pattern).

**5. Onboarding (later phase).** Pick a few life-areas with sensible defaults pre-selected; setup-as-you-go rather than upfront full config; a zero-config user still gets a working planner.

These IA changes interleave with the visual phases below (a section's Phase-N restyle includes adding its Setup tab and wiring it to the new nav).

**6. Section model — Hybrid + AI-editable (approved).** Sections come in two kinds, and the AI works across both:
- **Built-in sections** (Work, Finances, Gym, Study, …) stay hardcoded in `constants.ts` because they carry specialized logic generic templates can't express (gas/km calculator, earnings breakdown, per-section Excel export, sharing scopes).
- **AI-generated custom sections** continue via the `section-template` model (`/api/sections/templates`, `/sections/[slug]`, `layout-renderer`) — AI produces `fields` + `viewType` + `layoutHtml` from a prompt.
- **New capability:** the AI can also *edit/extend built-ins* (e.g. "add a Tips column to Work"). Built-ins are React, not template-driven, so this needs a mechanism — an **extensible custom-fields/columns layer** attached to a built-in section (extra fields stored per-user and rendered alongside the bespoke UI), rather than rewriting the built-in. The implementation plan must design this layer; it is the one non-trivial new piece of this decision.
- **AI entry point:** the **AI Studio** modal (✨ button) is the single home for generate + update. **Export** and **Sharing** are NOT in AI Studio — they live in Settings → Data (and optionally per-section menus).

## 4. Affected Surfaces

**Token layer:** `src/app/globals.css` (full rewrite of the system, keep structure/var names where consumed).

**Shared primitives:** `src/components/ui/` — `card.tsx`, `button.tsx`, `form-input.tsx`, `progress.tsx`, `progress-pie.tsx`, `modal.tsx`, `segmented-control.tsx`, `toggle-switch.tsx`, `empty-state.tsx`, `skeleton.tsx`; new `stat-block.tsx`. Layout: `app-sidebar.tsx`, `top-bar.tsx`, `page-header.tsx`, `mobile-menu.tsx`.

**Pages (`src/app/(app)/` and others):** dashboard, work (+ `[jobName]`), gym, study, habits, finances, health, hobbies, housework, journal, reading, shopping, mealprep, goals, sections, settings, export, shared view (`shared/[token]`), onboarding, auth (login/register), landing components.

## 5. Approach — phased rollout

Too large for one plan. Decomposed into sequential sub-projects; **each phase gets its own implementation plan and PR**, and must leave the app shippable.

- **Phase 0 — Direction validation (optional, fast):** install the official Anthropic `frontend-design` skill and run it to pressure-test palette/type/motion against this spec. Adjust spec if it surfaces improvements. No code.
- **Phase 1 — Foundation:** rewrite `globals.css` token layer + restyle shared primitives + add `StatBlock`. All pages inherit the new look automatically. Establishes `.num`, surfaces, palette, motion tokens, type scale. *Gate: app builds, every page renders coherently in light + dark, no glass remains, contrast AA verified.*
- **Phase 2 — Dashboard (showcase):** full rebuild — hero stat block, grouped supporting metrics, drill-down, real empty states, state-change motion. The reference implementation for all later pages.
- **Phase 3 — Core trackers:** work (+ job detail), gym, study, finances — the number-heavy pages that benefit most from stat blocks + tabular figures.
- **Phase 4 — Secondary sections:** habits, health, hobbies, housework, journal, reading, shopping, mealprep, goals, dynamic `sections/[slug]`.
- **Phase 5 — Surrounding surfaces:** settings, export, shared public view, onboarding, auth, landing.

Each phase reuses Phase 1/2 primitives and patterns; later phases are largely mechanical application of the established system.

## 6. Testing & verification

- Per phase: `pnpm build` + `pnpm lint` clean; existing `vitest` suite green (logic tests should be unaffected).
- Visual gate per phase: light + dark render check at 375 / 768 / 1024 / 1440; no `backdrop-filter` remaining; every number uses `.num`; accent appears only on primary action/active/focus.
- Accessibility gate: WCAG AA contrast (4.5:1 text) on every text/background pair; visible focus states; `prefers-reduced-motion` respected.

## 7. Risks

- **Theme-switcher tension:** the multi-accent `data-theme` presets conflict with single-accent discipline. Decision: keep the mechanism but restrict presets to muted single-hue, non-purple; drop green-as-default. Revisit in Phase 1.
- **Dark mode warmth:** warm near-black can muddy if over-warmed; verify contrast carefully.
- **Font swap regressions:** `next/font` load + tabular-nums must be verified on Safari/iOS.
- **Scope creep:** phases must stay visual; resist refactoring data/logic mid-redesign except where a primitive boundary is genuinely improved.

## 8. Research basis (for reference)

- AI-slop tells & fixes: glassmorphism overuse, Tailwind-default palettes, Inter/Plus-Jakarta defaults, uniform grids, ambient motion.
- Premium markers: rationed single accent, extreme size hierarchy, tabular figures, warm opacity-based neutrals, spring state-feedback, restraint/subtraction.
- Reference apps: Linear (accent discipline, weight), Notion Calendar (size contrast, warm neutrals, hairlines), Things 3 (restraint, delight via motion), Oura (one big thing, semantic color).
- Tooling: Anthropic `frontend-design` skill (commit to one aesthetic) + installed `ui-ux-pro-max` (tokens/scale) + Framer Motion (already present).
