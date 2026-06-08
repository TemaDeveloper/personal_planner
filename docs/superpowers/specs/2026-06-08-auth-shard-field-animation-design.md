# Auth Background — Falling Geometric Shards Animation

**Date:** 2026-06-08
**Status:** Approved (design)
**Scope:** Login + Register pages background animation

---

## Goal

Add an ambient background animation to the login and register (sign-up) pages: small geometric shards falling diagonally from the **top-right to the bottom-left**. The motif is "geometric shards" at "balanced" intensity (chosen via visual brainstorming). It must feel calm, match the app's editorial-calm aesthetic, adapt to the active theme, and respect accessibility/performance constraints.

## Non-Goals

- No animation on any page other than the two auth pages.
- No new runtime dependencies (no Remotion, no WebGL/three.js, no particle libraries).
- No video assets. This is a live, lightweight Canvas animation, not a pre-rendered `.mp4`.
- No changes to auth logic, forms, or styling of the card itself.

## Why Canvas (not Remotion)

Remotion renders video files; embedding a fixed `.mp4`/`.webm` background cannot adapt to the app's light/dark themes or accent variants (clay/sage/ocean/amber/plum), cannot respond to `prefers-reduced-motion`, and adds weight. A hand-rolled HTML Canvas 2D particle system is ~3KB, dependency-free, theme-aware, and accessible. Decision: **Canvas 2D**.

---

## Architecture

### New component: `ShardField`

- **Path:** `src/components/auth/shard-field.tsx`
- **Type:** Client component (`"use client"`).
- **Renders:** a single `<canvas>` element, `aria-hidden="true"`, `pointer-events: none`, fixed full-viewport, positioned behind page content.
- **Responsibility:** draw and animate the falling shard field. One clear purpose; no knowledge of auth or forms.
- **Props:** none required. Internal constants control tuning (see Parameters). Optional `className` passthrough for positioning is acceptable but not required.

### Integration: `src/app/(auth)/layout.tsx`

The shared auth layout renders `ShardField` once, behind the existing centered content:

- Add `<ShardField />` as the first child of the outer container.
- The outer container keeps `position` context; the canvas is `fixed; inset:0; z-index:0; pointer-events:none`.
- The existing content wrapper (`<div className="w-full max-w-md">`) gets `position: relative; z-index: 1` so the form sits above the canvas.
- Background `var(--bg-page)` stays as the base layer; shards draw on top of it but below the card.

Because both `/login` and `/register` use this layout, the animation appears on both with a single integration point.

---

## Motion Model

- Coordinate space: canvas pixels (CSS px), with `devicePixelRatio` scaling applied via `ctx.setTransform`.
- Each shard has: position `(x, y)`, size `s`, rotation `a`, angular velocity `va`, kind, opacity `o`.
- **Direction:** velocity `vx < 0` and `vy > 0` (moves left and down) → diagonal fall from top-right to bottom-left. Horizontal magnitude slightly larger than vertical (≈1.05×) to match the diagonal shown in the chosen preview.
- **Rotation:** slow per-frame `a += va`, with small `va` (balanced spin).
- **Respawn:** when a shard exits left (`x < -margin`) or bottom (`y > height + margin`), reposition it near the top/right region (`x` in upper-right band, `y` above the top edge) so the field stays populated and flow stays consistent.

### Shard kinds (balanced mix)

- `square` — stroked outline, neutral (text color).
- `line` — short stroked segment, neutral (text color).
- `triangle` — filled with accent color (reduced alpha) plus a faint neutral stroke.

Roughly even distribution across the three kinds.

---

## Parameters (Balanced intensity)

| Param | Value | Notes |
|---|---|---|
| Base count | ~30 | Scaled by viewport area (see below) |
| Speed | ~0.66 px/frame vertical (×1.05 horizontal) | Gentle drift |
| Spin | `va ∈ [-0.05, 0.05]` rad/frame | Slow tumble |
| Size | `s ∈ [4, 12]` px | |
| Opacity | `o ∈ [0.22, 0.65]` | |
| Accent fill alpha | `o × ~0.7` | Triangles only |

**Density scaling:** `count = round(BASE * clamp(viewportArea / REF_AREA, 0.5, 1.6))` where `REF_AREA` ≈ a 1440×900 reference. Keeps phones uncluttered and large monitors populated. Recompute on resize.

---

## Theme Awareness

At mount (and on theme-affecting changes if cheaply detectable), read computed CSS custom properties from `document.documentElement`:

- Neutral color ← `--text-primary` (used for square/line strokes and triangle outline).
- Accent color ← `--accent-color` (used for triangle fills).

Parse the returned color string and apply per-shard alpha when drawing. This makes the animation automatically correct for light mode, dark mode, and every accent theme (clay/sage/ocean/amber/plum) without hardcoded hex values.

> Implementation note: `--text-primary` is an `rgba(...)` value and `--accent-color` is a hex. The component normalizes both to `r,g,b` channels so it can apply its own per-shard alpha.

---

## Accessibility

- Canvas is `aria-hidden="true"` and `pointer-events: none` — invisible to assistive tech and never intercepts input.
- **Reduced motion:** if `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, draw a single static scattered frame and do **not** start the animation loop. (Optional: subscribe to changes so toggling the OS setting updates behavior, but a mount-time check is sufficient for v1.)

## Performance

- Single `requestAnimationFrame` loop; one canvas; O(count) per frame (~30 shapes). Negligible cost.
- **Pause when hidden:** on `document.visibilitychange`, cancel the RAF when hidden and resume when visible.
- `devicePixelRatio` capped at 2 to avoid oversized buffers on high-DPI displays.
- Resize handler re-measures the canvas and recomputes count (debounced/simple).

## Error Handling

- If `canvas.getContext('2d')` returns null, render the canvas element but skip all drawing/animation. The page degrades gracefully to the plain `--bg-page` background. No exceptions thrown.

## Cleanup

On unmount: cancel any pending RAF, remove `resize` and `visibilitychange` listeners. No leaks across navigations between `/login` and `/register`.

---

## Testing

Vitest + Testing Library component test at `src/components/auth/shard-field.test.tsx`:

1. **Mounts without crashing** and renders a `<canvas>` with `aria-hidden="true"`.
2. **Reduced-motion path:** with `matchMedia` mocked to report `prefers-reduced-motion: reduce`, the component does not start a RAF loop (assert `requestAnimationFrame` not called, or a static-render flag), and still renders the canvas.
3. **Graceful degradation:** with `getContext` mocked to return `null`, the component renders without throwing.

Canvas drawing calls themselves are not asserted pixel-by-pixel; tests focus on lifecycle, accessibility, and the reduced-motion/degradation branches.

---

## Files Touched

| File | Change |
|---|---|
| `src/components/auth/shard-field.tsx` | New — the Canvas animation component |
| `src/components/auth/shard-field.test.tsx` | New — lifecycle/a11y/reduced-motion tests |
| `src/app/(auth)/layout.tsx` | Render `<ShardField />` behind content; add `position/z-index` layering |

## Acceptance Criteria

- Visiting `/login` and `/register` shows geometric shards falling diagonally from top-right to bottom-left at "balanced" density.
- Colors match the active theme and adapt to light/dark mode.
- With OS reduced-motion enabled, shards are static (no animation).
- The form remains fully interactive; the canvas never blocks clicks or focus.
- No new dependencies added; existing tests still pass; new tests pass.
