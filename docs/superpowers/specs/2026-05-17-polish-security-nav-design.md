# Full Polish, Security Hardening & Navigation Refactor

**Date:** 2026-05-17  
**Approach:** Sequential — Security first, then nav refactor, then visual polish  
**Scope:** Security audit + fixes, mobile nav replacement, full frontend polish

---

## 1. Mobile Navigation Refactor

### Remove
- Delete `src/components/layout/mobile-nav.tsx` (bottom tab bar + bottom sheet)
- Remove MobileNav import and usage from `src/app/(app)/layout.tsx`

### Add: Hamburger Menu in Top Bar
- Add a `Menu` icon (lucide-react) to the left side of `src/components/layout/top-bar.tsx`, visible only on mobile (`md:hidden`)
- On tap, a dropdown panel slides down from the top bar
- Animation: framer-motion `AnimatePresence` + `motion.div` with y-axis spring (stiffness: 400, damping: 35) — matches existing motion patterns
- Backdrop overlay behind panel (tap to close, `z-40`)
- Panel z-index: `z-50`

### Dropdown Panel Contents
- Dashboard link
- All enabled sections (including custom sections from SectionsProvider)
- Settings link
- Export link
- Sign Out button
- Active section highlighted with accent glow (same pattern as `app-sidebar.tsx`)

### Panel Behavior
- Max height: ~70vh, scrollable if many sections
- Respects theme system (dark/light, accent colors, CSS custom properties)
- Closes on navigation (route change)
- Closes on backdrop tap
- Close button (X icon) in panel header

### Desktop
- `app-sidebar.tsx` stays completely untouched
- Hamburger icon hidden on `md:` and above

---

## 2. Security Audit & Fixes

### API Route Hardening
- Add Zod schema validation on all POST/PATCH/PUT request bodies
- Current state: basic `if (!field)` checks only — upgrade to structured schemas
- Audit all MongoDB queries for operator injection — ensure user input never flows into `$where`, `$regex`, or operator positions
- Add `String()` coercion on query parameters to prevent object injection (e.g. `?id[$gt]=`)
- Verify every API route gates on `userId` — no cross-user data access possible

### Auth & Session
- Verify middleware matcher covers all protected routes exhaustively
- Check token rotation behavior on login (session fixation)
- Document `trustHost: true` risk (acceptable for Vercel deployment)

### Headers & Environment
- Add security headers via `next.config.ts`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (restrict camera, microphone, geolocation)
- Audit for env var leakage — check no secrets use `NEXT_PUBLIC_` prefix
- Verify `.env.local` is in `.gitignore`

### Dependencies
- Run `pnpm audit` and fix vulnerable packages
- Flag NextAuth 5.0.0-beta.31 as known beta risk

### AI-Generated Content
- Verify no `dangerouslySetInnerHTML` usage with user/AI content
- Validate template fields from shared pool before rendering

---

## 3. Frontend Polish

### Visual Consistency
- Standardize spacing: `px-6 py-4` (mobile) / `px-8 py-6` (desktop) across all section pages
- Consistent typography hierarchy (headings, labels, body text — sizes and weights)
- Verify accent color usage is consistent (active states, buttons, links use `--accent-color`)
- Cards, modals, form inputs share consistent border-radius, shadow, border color

### Animations & Transitions
- Add framer-motion fade/slide page transition wrappers on route change
- Ensure all interactive elements have hover/active/focus states
- Add loading skeleton components (pulse animations) where data is fetched
- Consistent modal open/close animations across all sections

### Empty States
- Audit every section for missing empty states
- Add friendly empty state messages with clear CTA (e.g. "No habits yet — add your first one")
- Consistent empty state pattern: icon + message + action button

### Responsive Edge Cases
- Test all pages at: 375px, 390px, 428px, 768px, 1024px, 1440px
- Fix text overflow, truncation, layout breakage
- Ensure modals, date pickers, dropdowns don't overflow on small screens
- Verify new hamburger menu works across all mobile sizes

### AI-Generated Section UI
- Dynamically generated fields must render with same polish as built-in sections
- Smart field types (numbers, dates, toggles, selects) use existing UI primitives: `FormInput`, `ToggleSwitch`, `SegmentedControl`
- Cards and layouts for custom sections match design language of built-in sections

---

## Execution Order

1. **Security** — audit and fix all findings
2. **Navigation** — remove bottom nav, add hamburger dropdown
3. **Polish** — visual consistency, animations, empty states, responsive fixes

Sequential to avoid merge conflicts in shared files (`layout.tsx`, `top-bar.tsx`, providers).

---

## Files Affected (Primary)

| File | Changes |
|------|---------|
| `src/components/layout/mobile-nav.tsx` | Delete |
| `src/components/layout/top-bar.tsx` | Add hamburger + dropdown panel |
| `src/app/(app)/layout.tsx` | Remove MobileNav, adjust layout |
| `src/app/api/*/route.ts` | Add Zod validation, input sanitization |
| `middleware.ts` | Verify matcher coverage |
| `next.config.ts` | Add security headers |
| `src/components/ui/*.tsx` | Polish, hover states, loading skeletons |
| `src/app/(app)/*/page.tsx` | Empty states, spacing, transitions |
| `src/components/sections/*.tsx` | Visual consistency, responsive fixes |
