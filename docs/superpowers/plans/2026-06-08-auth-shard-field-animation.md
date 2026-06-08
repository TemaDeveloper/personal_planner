# Auth Falling-Shards Background Animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an ambient Canvas animation of geometric shards falling diagonally (top-right → bottom-left) behind the login and register pages.

**Architecture:** A single dependency-free client component (`ShardField`) renders a fixed, full-viewport `<canvas>` behind the centered auth card. It reads theme colors from CSS variables, animates ~30 shards with `requestAnimationFrame`, respects `prefers-reduced-motion` (static frame), pauses when the tab is hidden, and degrades gracefully if the 2D context is unavailable. It is mounted once in the shared `(auth)/layout.tsx`, so both `/login` and `/register` get it.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, HTML Canvas 2D, Vitest + Testing Library (jsdom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-08-auth-shard-field-animation-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/auth/shard-field.tsx` | New. The Canvas animation component — all drawing, animation, theme, a11y, perf, cleanup. |
| `src/components/auth/__tests__/shard-field.test.tsx` | New. Lifecycle/a11y/reduced-motion/degradation tests. |
| `src/app/(auth)/layout.tsx` | Modify. Render `<ShardField />` behind content; add z-index layering. |

Test location follows the existing convention (`__tests__/` subfolder next to the component, e.g. `src/components/ui/__tests__/card.test.tsx`).

### Notes on the jsdom test environment

- `src/test/setup.ts` only imports `@testing-library/jest-dom/vitest`. It does **not** polyfill `window.matchMedia` or `HTMLCanvasElement.prototype.getContext`.
- By default in jsdom, `canvas.getContext("2d")` returns `null` and `window.matchMedia` is `undefined`. The component is written to handle both (early-return / optional-chaining), so the default-jsdom path exercises graceful degradation. Tests that need the animation path mock these explicitly.

---

## Task 1: Build the `ShardField` component (TDD)

**Files:**
- Create: `src/components/auth/shard-field.tsx`
- Test: `src/components/auth/__tests__/shard-field.test.tsx`

This component is a single cohesive Canvas unit; its testable surface is lifecycle and branch selection (a11y attributes, graceful degradation when no 2D context, reduced-motion static vs. animated). Pixel output is not asserted.

- [ ] **Step 1: Write the failing tests**

Create `src/components/auth/__tests__/shard-field.test.tsx`:

```tsx
// src/components/auth/__tests__/shard-field.test.tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ShardField } from "../shard-field";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // remove any matchMedia we stubbed onto window
  // @ts-expect-error allow deleting the test stub
  delete window.matchMedia;
});

// A no-op 2D context stub good enough for the drawing calls the component makes.
function fakeCtx() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

describe("ShardField", () => {
  it("renders a canvas that is hidden from assistive tech and ignores pointers", () => {
    const { container } = render(<ShardField />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveStyle({ pointerEvents: "none" });
  });

  it("degrades gracefully when no 2D context is available (no throw)", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    expect(() => render(<ShardField />)).not.toThrow();
    expect(raf).not.toHaveBeenCalled();
  });

  it("does NOT animate when prefers-reduced-motion is set (renders a static frame)", () => {
    stubMatchMedia(true);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx());
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<ShardField />);
    expect(raf).not.toHaveBeenCalled();
  });

  it("animates when motion is allowed", () => {
    stubMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx());
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    render(<ShardField />);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("cancels animation and removes listeners on unmount", () => {
    stubMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx());
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const removeWin = vi.spyOn(window, "removeEventListener");
    const removeDoc = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<ShardField />);
    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
    expect(removeWin).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- shard-field`
Expected: FAIL — module `../shard-field` cannot be resolved (component does not exist yet).

- [ ] **Step 3: Implement the component**

Create `src/components/auth/shard-field.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

type Shard = {
  x: number;
  y: number;
  size: number;
  angle: number;
  spin: number;
  kind: 0 | 1 | 2; // 0 = square outline, 1 = line, 2 = filled triangle
  opacity: number;
};

const BASE_COUNT = 30;
const REF_AREA = 1440 * 900;
const SPEED = 0.66; // vertical px/frame
const H_FACTOR = 1.05; // horizontal is slightly faster → diagonal ↙
const RESPAWN_MARGIN = 25;

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Normalize a hex or rgb(a) CSS color string to [r,g,b]. Falls back to warm sand. */
function parseRgb(input: string): [number, number, number] {
  const s = (input || "").trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const n = parseInt(full, 16);
    if (!Number.isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/\d+(?:\.\d+)?/g);
  if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
  return [232, 217, 200];
}

export function ShardField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // graceful degradation — page shows plain --bg-page

    const styles = getComputedStyle(document.documentElement);
    const neutral = parseRgb(styles.getPropertyValue("--text-primary"));
    const accent = parseRgb(styles.getPropertyValue("--accent-color") || "#C0613C");
    const [nr, ng, nb] = neutral;
    const [ar, ag, ab] = accent;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let shards: Shard[] = [];
    let rafId = 0;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    function countFor(w: number, h: number): number {
      const scale = Math.max(0.5, Math.min(1.6, (w * h) / REF_AREA));
      return Math.round(BASE_COUNT * scale);
    }

    function makeShard(fromTopRight: boolean): Shard {
      return {
        x: fromTopRight ? rand(width * 0.3, width + 40) : rand(-20, width + 40),
        y: fromTopRight ? rand(-40, height * 0.3) : rand(-30, height),
        size: rand(4, 12),
        angle: rand(0, Math.PI * 2),
        spin: rand(-0.05, 0.05),
        kind: (Math.floor(rand(0, 3)) % 3) as 0 | 1 | 2,
        opacity: rand(0.22, 0.65),
      };
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      shards = Array.from({ length: countFor(width, height) }, () => makeShard(false));
    }

    function drawShard(s: Shard) {
      ctx!.save();
      ctx!.translate(s.x, s.y);
      ctx!.rotate(s.angle);
      ctx!.strokeStyle = `rgba(${nr},${ng},${nb},${s.opacity})`;
      ctx!.lineWidth = 1.3;
      if (s.kind === 0) {
        ctx!.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);
      } else if (s.kind === 1) {
        ctx!.beginPath();
        ctx!.moveTo(-s.size, 0);
        ctx!.lineTo(s.size, 0);
        ctx!.stroke();
      } else {
        ctx!.fillStyle = `rgba(${ar},${ag},${ab},${s.opacity * 0.7})`;
        ctx!.beginPath();
        ctx!.moveTo(0, -s.size);
        ctx!.lineTo(s.size, s.size);
        ctx!.lineTo(-s.size, s.size);
        ctx!.closePath();
        ctx!.fill();
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function paintStatic() {
      ctx!.clearRect(0, 0, width, height);
      for (const s of shards) drawShard(s);
    }

    function step() {
      ctx!.clearRect(0, 0, width, height);
      for (const s of shards) {
        s.x -= SPEED * H_FACTOR;
        s.y += SPEED;
        s.angle += s.spin;
        if (s.x < -RESPAWN_MARGIN || s.y > height + RESPAWN_MARGIN) {
          Object.assign(s, makeShard(true));
        }
        drawShard(s);
      }
      rafId = window.requestAnimationFrame(step);
    }

    resize();

    if (reduceMotion) {
      paintStatic();
    } else {
      rafId = window.requestAnimationFrame(step);
    }

    function onResize() {
      resize();
      if (reduceMotion) paintStatic();
    }

    function onVisibility() {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (!reduceMotion && rafId === 0) {
        rafId = window.requestAnimationFrame(step);
      }
    }

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- shard-field`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/shard-field.tsx src/components/auth/__tests__/shard-field.test.tsx
git commit -m "feat: add ShardField canvas animation for auth pages

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Mount `ShardField` in the auth layout

**Files:**
- Modify: `src/app/(auth)/layout.tsx`

The current layout (for reference):

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-page)" }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

- [ ] **Step 1: Replace the file contents**

Overwrite `src/app/(auth)/layout.tsx` with:

```tsx
import { ShardField } from "@/components/auth/shard-field";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "var(--bg-page)" }}
    >
      <ShardField />
      <div className="w-full max-w-md relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
```

Notes:
- `relative overflow-hidden` on the container scopes the visual and clips any shard drawn at the edges.
- The canvas is `position: fixed; zIndex: 0`; the content wrapper is `relative; zIndex: 1`, so the form sits above the animation and stays interactive.

- [ ] **Step 2: Verify the existing test suite still passes**

Run: `npm test`
Expected: PASS — no regressions (the layout is a server component importing a client component, which is valid in the App Router).

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/layout.tsx"
git commit -m "feat: render falling-shards background on login and register pages

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify on both pages**

Open `http://localhost:3000/login` and `http://localhost:3000/register`. Confirm:
- Geometric shards (squares, lines, accent-filled triangles) fall diagonally from the top-right toward the bottom-left.
- Density looks "balanced" — present but not busy; the form is clearly readable above it.
- The form inputs, buttons, and the "Sign up"/"Sign in" links are all clickable and focusable (the canvas does not intercept input).

- [ ] **Step 3: Verify theme adaptation**

Toggle dark mode and switch the accent theme (clay/sage/ocean/amber/plum) via the app's theme controls (or by setting `data-theme` on `<html>` in devtools). Confirm the triangle fills change to the active accent and the outline shards remain legible against both light and dark `--bg-page`.

- [ ] **Step 4: Verify reduced motion**

In OS settings (macOS: System Settings → Accessibility → Display → Reduce motion) or via devtools emulation (Rendering tab → "Emulate CSS prefers-reduced-motion: reduce"), reload `/login`. Confirm the shards are rendered **static** (no movement).

- [ ] **Step 5: Verify tab-hidden pause (optional)**

Switch to another tab for a few seconds and return. The animation should resume smoothly (it pauses while hidden to save CPU).

---

## Self-Review

**Spec coverage:**
- Component `ShardField` at the specified path → Task 1. ✓
- Mounted once in `(auth)/layout.tsx`, behind content, both pages → Task 2. ✓
- Diagonal motion top-right → bottom-left (`vx<0, vy>0`, H_FACTOR) → Task 1 `step()`. ✓
- Balanced parameters (count ~30, area scaling, speed, spin, size, opacity, accent alpha 0.7) → Task 1 constants + `makeShard`/`drawShard`. ✓
- Three shard kinds (square outline, line, filled triangle) → Task 1 `drawShard`. ✓
- Theme-aware via `--text-primary` / `--accent-color` → Task 1 `parseRgb` + getComputedStyle. ✓
- Reduced-motion static frame → Task 1 `reduceMotion`/`paintStatic`; test 3; manual Step 4. ✓
- A11y: `aria-hidden`, `pointer-events:none` → Task 1 JSX; test 1. ✓
- Performance: single RAF, visibility pause, dpr cap → Task 1. ✓
- Graceful degradation on null context → Task 1 early return; test 2. ✓
- Cleanup on unmount → Task 1 return; test 5. ✓
- Tests for lifecycle/a11y/reduced-motion/degradation → Task 1 Step 1. ✓
- No new dependencies → confirmed (only React + Canvas). ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `Shard` type, `makeShard`/`drawShard`/`paintStatic`/`step`/`resize`/`countFor`/`parseRgb`/`rand` names and signatures are consistent between definition and use. `ShardField` import path (`@/components/auth/shard-field`) matches the created file. ✓
