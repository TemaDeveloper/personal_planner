# Editorial Calm — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the glassmorphism token system with the "Editorial Calm" foundation (warm neutrals, single clay accent, opacity text tiers, tabular figures, hairline flat surfaces, Hanken Grotesk) and restyle the shared primitives + add a `StatBlock`, so every page inherits the new look without per-page edits.

**Architecture:** Redefine the *existing* CSS custom-property tokens in `src/app/globals.css` in place (same variable names, new values) so all consumers update automatically. Flatten the shared `surface-*` component classes (remove `backdrop-filter`/glow). Swap the default font to Hanken Grotesk via `next/font`. Restyle `Card`/`Button`/`Progress` and add a new `StatBlock` primitive with a `.num` tabular utility. Keep the `data-theme`/`data-font` switcher mechanism but with muted single-hue presets and clay as default.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (`@theme inline`), `next/font/google`, vitest + @testing-library/react.

**Branch:** `redesign/editorial-calm` (already checked out).

**Spec:** `docs/superpowers/specs/2026-06-05-editorial-calm-redesign-design.md`
**Approved prototype (reference for exact values):** `design-preview/index.html`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/app/globals.css` | Token layer + flat component classes + `.num`/stat utilities | Rewrite |
| `src/app/layout.tsx` | Load Hanken Grotesk, default font, flat Toaster | Modify |
| `src/lib/constants.ts` | `THEMES` muted hues, `THEME_COLORS`, default theme | Modify |
| `src/components/ui/stat-block.tsx` | New signature primitive (hero number + label) | Create |
| `src/components/ui/__tests__/stat-block.test.tsx` | StatBlock render tests | Create |
| `src/components/ui/card.tsx` | Flat hairline card | Modify |
| `src/components/ui/__tests__/card.test.tsx` | Card variant tests | Create |
| `src/components/ui/button.tsx` | Editorial button (clay primary, tactile) | Modify |
| `src/components/ui/__tests__/button.test.tsx` | Button variant tests | Create |
| `src/components/ui/progress.tsx` | Flat hairline progress | Modify |
| `src/components/layout/app-sidebar.tsx` | Remove glow/blur from logo + sidebar | Modify |
| `src/lib/__tests__/globals-tokens.test.ts` | Guard test: tokens present, glass removed | Create |

---

## Task 1: Token guard test (red) — define what "Editorial Calm tokens" means

**Files:**
- Create: `src/lib/__tests__/globals-tokens.test.ts`

This test reads `globals.css` as text and asserts the Editorial Calm tokens exist and the glass defaults are gone. It locks the CSS contract before we rewrite the file.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/globals-tokens.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("Editorial Calm token layer", () => {
  it("uses the warm canvas background", () => {
    expect(css).toContain("--background: #F7F6F3");
  });

  it("uses the clay brand accent (not the old green)", () => {
    expect(css).toContain("--primary: #C0613C");
    expect(css).not.toContain("#22C55E");
  });

  it("defines muted semantic tokens", () => {
    expect(css).toContain("--good:");
    expect(css).toContain("--warn:");
    expect(css).toContain("--alert:");
  });

  it("removes glassmorphism defaults from the card surface", () => {
    // surface-card must not blur the backdrop anymore
    const surfaceCardBlock = css.slice(css.indexOf(".surface-card {"), css.indexOf(".surface-card {") + 400);
    expect(surfaceCardBlock).not.toContain("backdrop-filter");
  });

  it("removes the ambient decorative animations", () => {
    expect(css).not.toContain("pulse-glow");
    expect(css).not.toContain("animate-shimmer");
  });

  it("provides a tabular-figures utility", () => {
    expect(css).toContain(".num");
    expect(css).toContain("tabular-nums");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/__tests__/globals-tokens.test.ts`
Expected: FAIL — current CSS has `#22C55E`, `backdrop-filter` in `.surface-card`, `pulse-glow`, and no `--good`/`.num`.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/lib/__tests__/globals-tokens.test.ts
git commit -m "test: lock Editorial Calm token contract for globals.css"
```

---

## Task 2: Rewrite `globals.css` to the Editorial Calm token layer (green)

**Files:**
- Modify: `src/app/globals.css` (full replacement)

Replace the entire file with the content below. Keep the `@theme inline` block (it maps `--color-*` → `--*` and is consumed by Tailwind utilities). Redefine `:root` / `:root.dark` token *values*, flatten the `surface-*` classes, drop glass/glow/shimmer, add `.num` + stat utilities. Existing variable names are preserved so all pages keep working.

- [ ] **Step 1: Replace the file contents**

```css
/* ============================================================
   EDITORIAL CALM — Design System v4
   Swiss/editorial planner · warm neutrals · one clay accent ·
   tabular figures · hairline flat surfaces · light + dark
   ============================================================ */

@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

/* ── Light Mode (default) ── */
:root {
  --radius: 0.625rem;

  /* Core palette — warm neutrals */
  --background: #F7F6F3;
  --foreground: #1C1917;
  --card: #FFFFFF;
  --card-foreground: #1C1917;
  --popover: #FFFFFF;
  --popover-foreground: #1C1917;
  --primary: #C0613C;
  --primary-foreground: #FFFFFF;
  --secondary: rgba(28, 25, 23, 0.05);
  --secondary-foreground: #1C1917;
  --muted: rgba(28, 25, 23, 0.05);
  --muted-foreground: rgba(28, 25, 23, 0.56);
  --accent: #C0613C;
  --accent-foreground: #FFFFFF;
  --destructive: #C0563C;
  --destructive-foreground: #FFFFFF;
  --border: rgba(28, 25, 23, 0.10);
  --input: rgba(28, 25, 23, 0.10);
  --ring: #C0613C;
  --chart-1: #C0613C;
  --chart-2: #3F6B8C;
  --chart-3: #7A5C7E;
  --chart-4: #C99A3B;
  --chart-5: #5E8C6A;

  /* Sidebar */
  --sidebar: #FCFBF9;
  --sidebar-foreground: #1C1917;
  --sidebar-primary: #C0613C;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: rgba(28, 25, 23, 0.05);
  --sidebar-accent-foreground: #1C1917;
  --sidebar-border: rgba(28, 25, 23, 0.10);
  --sidebar-ring: #C0613C;

  /* Surface hierarchy (flat, warm) */
  --surface-1: #FCFBF9;
  --surface-2: #F2F0EC;
  --surface-3: #FFFFFF;
  --text-primary: rgba(28, 25, 23, 0.92);
  --text-muted: rgba(28, 25, 23, 0.56);
  --text-faint: rgba(28, 25, 23, 0.38);
  --border-subtle: rgba(28, 25, 23, 0.10);
  --hair-strong: rgba(28, 25, 23, 0.16);

  /* Accent */
  --accent-color: #C0613C;
  --accent-dim: #A24E2E;
  --accent-glow: rgba(192, 97, 60, 0.09);

  /* Semantic (muted, data-only) */
  --good: #5E8C6A;  --good-wash: rgba(94, 140, 106, 0.15);
  --warn: #C99A3B;  --warn-wash: rgba(201, 154, 59, 0.17);
  --alert: #C0563C; --alert-wash: rgba(192, 86, 60, 0.15);

  /* Shadows — reserved for overlays only */
  --shadow-sm: 0 1px 2px rgba(28, 25, 23, 0.05);
  --shadow-card: none;
  --shadow-elevated: 0 8px 24px rgba(28, 25, 23, 0.10), 0 2px 6px rgba(28, 25, 23, 0.05);
  --shadow-overlay: 0 16px 48px rgba(28, 25, 23, 0.14), 0 4px 12px rgba(28, 25, 23, 0.06);

  --backdrop-overlay: rgba(20, 18, 16, 0.32);
}

/* ── Dark Mode ── */
:root.dark {
  --background: #0F0F0E;
  --foreground: #F5F3F0;
  --card: #1A1A17;
  --card-foreground: #F5F3F0;
  --popover: #1A1A17;
  --popover-foreground: #F5F3F0;
  --primary: #D2724A;
  --primary-foreground: #1A1A17;
  --secondary: rgba(245, 243, 240, 0.06);
  --secondary-foreground: #F5F3F0;
  --muted: rgba(245, 243, 240, 0.06);
  --muted-foreground: rgba(245, 243, 240, 0.58);
  --accent: #D2724A;
  --accent-foreground: #1A1A17;
  --destructive: #D87358;
  --destructive-foreground: #FFFFFF;
  --border: rgba(245, 243, 240, 0.10);
  --input: rgba(245, 243, 240, 0.10);
  --ring: #D2724A;
  --chart-1: #D2724A;
  --chart-2: #6FA0C4;
  --chart-3: #A78BAE;
  --chart-4: #D8B057;
  --chart-5: #7BA888;

  --sidebar: #161614;
  --sidebar-foreground: #F5F3F0;
  --sidebar-primary: #D2724A;
  --sidebar-primary-foreground: #1A1A17;
  --sidebar-accent: rgba(245, 243, 240, 0.06);
  --sidebar-accent-foreground: #F5F3F0;
  --sidebar-border: rgba(245, 243, 240, 0.10);
  --sidebar-ring: #D2724A;

  --surface-1: #161614;
  --surface-2: #211F1C;
  --surface-3: #1A1A17;
  --text-primary: rgba(245, 243, 240, 0.94);
  --text-muted: rgba(245, 243, 240, 0.58);
  --text-faint: rgba(245, 243, 240, 0.40);
  --border-subtle: rgba(245, 243, 240, 0.10);
  --hair-strong: rgba(245, 243, 240, 0.18);

  --accent-color: #D2724A;
  --accent-dim: #E08358;
  --accent-glow: rgba(210, 114, 74, 0.13);

  --good: #7BA888;  --good-wash: rgba(123, 168, 136, 0.16);
  --warn: #D8B057;  --warn-wash: rgba(216, 176, 87, 0.16);
  --alert: #D87358; --alert-wash: rgba(216, 115, 88, 0.16);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-card: none;
  --shadow-elevated: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3);
  --shadow-overlay: 0 24px 64px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3);

  --backdrop-overlay: rgba(0, 0, 0, 0.6);
}

/* ── Accent presets (muted, single-hue, non-purple) ── */
:root[data-theme="clay"]  { --primary: #C0613C; --ring: #C0613C; --accent: #C0613C; --accent-color: #C0613C; --accent-dim: #A24E2E; --accent-glow: rgba(192,97,60,0.09);  --chart-1: #C0613C; --sidebar-primary: #C0613C; }
:root[data-theme="sage"]  { --primary: #5E8C6A; --ring: #5E8C6A; --accent: #5E8C6A; --accent-color: #5E8C6A; --accent-dim: #4C7457; --accent-glow: rgba(94,140,106,0.10); --chart-1: #5E8C6A; --sidebar-primary: #5E8C6A; }
:root[data-theme="ocean"] { --primary: #3F6B8C; --ring: #3F6B8C; --accent: #3F6B8C; --accent-color: #3F6B8C; --accent-dim: #335875; --accent-glow: rgba(63,107,140,0.10);  --chart-1: #3F6B8C; --sidebar-primary: #3F6B8C; }
:root[data-theme="amber"] { --primary: #B07D2B; --ring: #B07D2B; --accent: #B07D2B; --accent-color: #B07D2B; --accent-dim: #946823; --accent-glow: rgba(176,125,43,0.10);  --chart-1: #B07D2B; --sidebar-primary: #B07D2B; }
:root[data-theme="plum"]  { --primary: #7A5C7E; --ring: #7A5C7E; --accent: #7A5C7E; --accent-color: #7A5C7E; --accent-dim: #654C68; --accent-glow: rgba(122,92,126,0.10);  --chart-1: #7A5C7E; --sidebar-primary: #7A5C7E; }
:root.dark[data-theme="clay"]  { --accent-glow: rgba(210,114,74,0.13); }
:root.dark[data-theme="sage"]  { --accent-glow: rgba(123,168,136,0.14); }
:root.dark[data-theme="ocean"] { --accent-glow: rgba(111,160,196,0.14); }
:root.dark[data-theme="amber"] { --accent-glow: rgba(216,176,87,0.14); }
:root.dark[data-theme="plum"]  { --accent-glow: rgba(167,139,174,0.14); }

/* ── Layout density ── */
:root[data-layout="compact"]  { --radius: 0.45rem; }
:root[data-layout="spacious"] { --radius: 0.85rem; }

/* ── Font variants (one editorial grotesque by default) ── */
:root,
:root[data-font="sans"] {
  --font-display: var(--font-hanken), 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: var(--font-hanken), 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
:root[data-font="inter"]     { --font-display: var(--font-inter), 'Inter', sans-serif; --font-body: var(--font-inter), 'Inter', sans-serif; }
:root[data-font="geometric"] { --font-display: var(--font-space-grotesk), 'Space Grotesk', sans-serif; --font-body: var(--font-hanken), 'Hanken Grotesk', sans-serif; }
:root[data-font="serif"]     { --font-display: var(--font-playfair), 'Playfair Display', Georgia, serif; --font-body: var(--font-hanken), 'Hanken Grotesk', sans-serif; }
:root[data-font="mono"]      { --font-display: var(--font-jetbrains), 'JetBrains Mono', monospace; --font-body: var(--font-jetbrains), 'JetBrains Mono', monospace; }

/* ═══════════════════════════════════════════════
   BASE LAYER
   ═══════════════════════════════════════════════ */
@layer base {
  * { @apply border-border outline-ring/50; }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-body, 'Hanken Grotesk', -apple-system, system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }
  h1, h2, h3 {
    font-family: var(--font-display, 'Hanken Grotesk', -apple-system, system-ui, sans-serif);
    letter-spacing: -0.025em;
  }
  code, .mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }

  ::selection { background: var(--accent-glow); color: var(--text-primary); }

  :focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
}

/* ═══════════════════════════════════════════════
   COMPONENT LAYER
   ═══════════════════════════════════════════════ */
@layer components {
  /* ── Surfaces — flat, hairline (NO glass) ── */
  .surface-card {
    background: var(--card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .surface-card.interactive:hover { border-color: var(--hair-strong); }

  .surface-elevated {
    background: var(--popover);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-elevated);
  }

  .surface-inset {
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
  }

  /* ── Tabular figures (every number) ── */
  .num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
    letter-spacing: -0.01em;
  }

  /* ── Stat block (signature element) ── */
  .stat-value {
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }
  .stat-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--text-muted);
  }

  /* ── Form inputs ── */
  .form-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.9375rem;
    line-height: 1.5;
    background: var(--surface-2);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
    appearance: none;
  }
  .form-input::placeholder { color: var(--text-faint); }
  .form-input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  .form-input:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Animations (feedback only) ── */
  @keyframes slide-up-fade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  @keyframes ring-fill { from { stroke-dashoffset: 283; } to { stroke-dashoffset: var(--target-offset); } }

  .animate-slide-up { animation: slide-up-fade 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .animate-slide-up-delay-1 { animation: slide-up-fade 0.4s 0.05s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .animate-slide-up-delay-2 { animation: slide-up-fade 0.4s 0.10s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .animate-slide-up-delay-3 { animation: slide-up-fade 0.4s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .animate-slide-up-delay-4 { animation: slide-up-fade 0.4s 0.20s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
  .animate-scale-in { animation: scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .habit-ring-progress { animation: ring-fill 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

  .glass-lift { transition: border-color 0.15s ease; }
  .glass-lift:hover { border-color: var(--hair-strong); }

  @media (prefers-reduced-motion: reduce) {
    .animate-slide-up, .animate-slide-up-delay-1, .animate-slide-up-delay-2,
    .animate-slide-up-delay-3, .animate-slide-up-delay-4, .animate-fade-in,
    .animate-scale-in, .habit-ring-progress, .glass-lift, .surface-card, .surface-card.interactive {
      animation: none !important;
      transition: none !important;
    }
  }

  /* ── Utility ── */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type="number"] { -moz-appearance: textfield; }
  input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
  :root.dark input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); opacity: 0.7; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(28, 25, 23, 0.14); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(28, 25, 23, 0.24); }
  :root.dark ::-webkit-scrollbar-thumb { background: rgba(245, 243, 240, 0.12); }
  :root.dark ::-webkit-scrollbar-thumb:hover { background: rgba(245, 243, 240, 0.22); }
}
```

- [ ] **Step 2: Run the token guard test to verify it passes**

Run: `pnpm test src/lib/__tests__/globals-tokens.test.ts`
Expected: PASS (all 6 assertions).

- [ ] **Step 3: Verify the app still builds**

Run: `pnpm build`
Expected: build completes with no CSS/compile errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: Editorial Calm token layer — warm neutrals, clay accent, flat surfaces"
```

---

## Task 3: Load Hanken Grotesk as the default font + flat Toaster

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add the Hanken Grotesk import and font instance**

Change the import on line 2 and add the font instance after it. Replace:

```tsx
import { Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono, Inter, Space_Grotesk } from "next/font/google";
```

with:

```tsx
import { Hanken_Grotesk, Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono, Inter, Space_Grotesk } from "next/font/google";
```

Then add this font instance immediately after the imports / before `const jakarta` (keep `jakarta` — it's still referenced by `data-font` legacy, but it is no longer default):

```tsx
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
```

- [ ] **Step 2: Register the font variable on `<html>` and default to clay theme**

Replace the `<html ...>` open tag (lines 67-74) with:

```tsx
    <html
      lang="en"
      className={`${hanken.variable} ${jakarta.variable} ${inter.variable} ${spaceGrotesk.variable} ${playfair.variable} ${jetbrains.variable}`}
      data-theme="clay"
      data-font="sans"
      data-layout="default"
      suppressHydrationWarning
    >
```

- [ ] **Step 3: Flatten the Toaster (remove glass)**

Replace the `<Toaster ... />` block (lines 84-96) with:

```tsx
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--popover)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-overlay)",
                },
              }}
            />
```

- [ ] **Step 4: Verify build + that Hanken is wired**

Run: `pnpm build`
Expected: build succeeds.
Run: `grep -c "font-hanken" src/app/layout.tsx`
Expected: `2` (the variable definition + the className usage).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: default to Hanken Grotesk, clay theme, flat toaster"
```

---

## Task 4: Update theme constants to muted single-hue presets

**Files:**
- Modify: `src/lib/constants.ts`

The `data-theme` presets in CSS are now `clay | sage | ocean | amber | plum`. The constants must match so the Settings swatches render the right options and colors.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/theme-constants.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { THEMES, THEME_COLORS, DEFAULT_ENABLED_SECTIONS } from "@/lib/constants";

describe("Editorial Calm theme constants", () => {
  it("uses muted single-hue presets led by clay", () => {
    expect(THEMES[0]).toBe("clay");
    expect(THEMES).toEqual(["clay", "sage", "ocean", "amber", "plum"]);
  });

  it("maps clay to the brand accent hex", () => {
    expect(THEME_COLORS.clay).toBe("#C0613C");
  });

  it("no preset is the old template green", () => {
    expect(Object.values(THEME_COLORS)).not.toContain("#22C55E");
  });

  it("keeps the default enabled sections intact", () => {
    expect(DEFAULT_ENABLED_SECTIONS).toContain("work");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/__tests__/theme-constants.test.ts`
Expected: FAIL — current `THEMES` starts with `amber` and `THEME_COLORS.amber` is `#22C55E`.

- [ ] **Step 3: Update the constants**

In `src/lib/constants.ts`, replace the `THEMES` definition (line 4) with:

```ts
export const THEMES = ["clay", "sage", "ocean", "amber", "plum"] as const;
```

and replace the `THEME_COLORS` map (lines 50-58) with:

```ts
export const THEME_COLORS: Record<AccentTheme, string> = {
  clay: "#C0613C",
  sage: "#5E8C6A",
  ocean: "#3F6B8C",
  amber: "#B07D2B",
  plum: "#7A5C7E",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/__tests__/theme-constants.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify nothing else references a removed theme name**

Run: `grep -rn '"teal"\|"violet"\|"rose"\|"sunset"' src --include=*.ts --include=*.tsx`
Expected: no results (these old theme names are gone). If any appear, they are stale and must be updated to one of the new names.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/lib/__tests__/theme-constants.test.ts
git commit -m "feat: muted single-hue accent presets (clay default)"
```

---

## Task 5: Create the `StatBlock` primitive

**Files:**
- Create: `src/components/ui/stat-block.tsx`
- Create: `src/components/ui/__tests__/stat-block.test.tsx`

The signature element: a big tabular number + tiny uppercase label + optional sub line, in size variants.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/__tests__/stat-block.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatBlock } from "../stat-block";

afterEach(cleanup);

describe("StatBlock", () => {
  it("renders the label and value", () => {
    render(<StatBlock label="This week" value="$1,240" />);
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("$1,240")).toBeInTheDocument();
  });

  it("applies tabular figures to the value", () => {
    render(<StatBlock label="Hours" value="31.5" />);
    expect(screen.getByText("31.5").className).toContain("num");
  });

  it("renders an optional sub line", () => {
    render(<StatBlock label="Earned" value="$1,240" sub="3 jobs · 31.5h" />);
    expect(screen.getByText("3 jobs · 31.5h")).toBeInTheDocument();
  });

  it("applies the hero size class for size=hero", () => {
    const { container } = render(<StatBlock label="Net" value="+$3,160" size="hero" />);
    expect(container.querySelector(".stat-value")?.className).toContain("text-5xl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/ui/__tests__/stat-block.test.tsx`
Expected: FAIL — `stat-block` module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/ui/stat-block.tsx
import { cn } from "@/lib/utils";

const sizeClasses = {
  hero: "text-4xl sm:text-5xl",
  lg: "text-2xl sm:text-3xl",
  md: "text-xl sm:text-2xl",
  sm: "text-lg",
} as const;

interface StatBlockProps {
  label: string;
  value: string;
  sub?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function StatBlock({ label, value, sub, size = "lg", className }: StatBlockProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="stat-label mb-1.5">{label}</p>
      <p className={cn("stat-value num", sizeClasses[size])}>{value}</p>
      {sub && <p className="mt-2 text-xs text-[var(--text-muted)] num truncate">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/ui/__tests__/stat-block.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/stat-block.tsx src/components/ui/__tests__/stat-block.test.tsx
git commit -m "feat: StatBlock signature primitive with tabular figures"
```

---

## Task 6: Flatten the `Card` primitive

**Files:**
- Modify: `src/components/ui/card.tsx`
- Create: `src/components/ui/__tests__/card.test.tsx`

`surface-card` is now flat (Task 2), so the Card only needs to drop the `scale` hover (which causes layout shift — an anti-pattern from the spec) in favor of a border hover.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/__tests__/card.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Card } from "../card";

afterEach(cleanup);

describe("Card", () => {
  it("renders children", () => {
    render(<Card>hello</Card>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("uses the flat surface-card class by default", () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass("surface-card");
  });

  it("interactive cards do NOT scale on hover (no layout shift)", () => {
    const { container } = render(<Card interactive>x</Card>);
    expect((container.firstChild as HTMLElement).className).not.toContain("hover:scale");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/ui/__tests__/card.test.tsx`
Expected: FAIL on the third test — current Card adds `hover:scale-[1.01]`.

- [ ] **Step 3: Update the Card**

Replace the `interactive &&` line (line 34) in `src/components/ui/card.tsx`:

```tsx
        interactive && "interactive cursor-pointer transition-colors duration-150",
```

(Removes `hover:scale-[1.01]` / `transition-transform`; the `.surface-card.interactive:hover` border feedback from globals.css now handles hover.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/ui/__tests__/card.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/__tests__/card.test.tsx
git commit -m "feat: flat Card — border hover instead of scale (no layout shift)"
```

---

## Task 7: Editorial `Button` primitive

**Files:**
- Modify: `src/components/ui/button.tsx`
- Create: `src/components/ui/__tests__/button.test.tsx`

Keep the existing API (`variant`, `size`). Tighten radius to the token, ensure `secondary`/`outline` read as flat editorial. The clay primary comes from `bg-primary` (now clay via tokens), so mostly we verify behavior and adjust the ghost/secondary surfaces.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/__tests__/button.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Button } from "../button";

afterEach(cleanup);

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("primary uses the clay bg-primary token", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("bg-primary");
  });

  it("keeps a tactile active press", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").className).toContain("active:scale-[0.98]");
  });

  it("uses rounded-md token radius for md size", () => {
    render(<Button size="md">Go</Button>);
    expect(screen.getByRole("button").className).toContain("rounded-md");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/ui/__tests__/button.test.tsx`
Expected: FAIL on the radius test — current `md` size uses `rounded-lg`.

- [ ] **Step 3: Update the Button size classes**

In `src/components/ui/button.tsx`, replace the `sizeClasses` block (lines 17-22) with:

```tsx
const sizeClasses = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-md",
  lg: "h-10 px-5 text-sm gap-2 rounded-md",
  icon: "h-9 w-9 rounded-md",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/ui/__tests__/button.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/__tests__/button.test.tsx
git commit -m "feat: editorial Button — token radius, tactile press"
```

---

## Task 8: Flatten `Progress` to a hairline track

**Files:**
- Modify: `src/components/ui/progress.tsx`

- [ ] **Step 1: Update the track background**

In `src/components/ui/progress.tsx`, replace the inner track `className` (line 24) — change the track background from `bg-[var(--surface-2)]` to the hairline token and keep the accent fill:

```tsx
          "flex-1 rounded-full overflow-hidden bg-[var(--border-subtle)]",
```

- [ ] **Step 2: Verify existing Progress usage still renders**

Run: `pnpm test`
Expected: the full suite passes (Progress has no dedicated test; this confirms no regression elsewhere).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/progress.tsx
git commit -m "feat: flat hairline Progress track"
```

---

## Task 9: Remove glass/glow from the sidebar shell

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Remove the backdrop-blur on the sidebar**

In `src/components/layout/app-sidebar.tsx`, replace the `<aside ...>` className (line 44) — drop `backdrop-blur-xl`:

```tsx
    <aside className="hidden md:flex flex-col flex-shrink-0 w-60 sticky top-0 h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
```

- [ ] **Step 2: Remove the glow box-shadow on the logo mark**

Replace the logo `<div>` (lines 47-52) with the glow removed:

```tsx
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-extrabold bg-[var(--accent-color)] text-primary-foreground">
          P
        </div>
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: flatten sidebar — remove backdrop blur and logo glow"
```

---

## Task 10: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass (existing suite + new card/button/stat-block/globals-tokens/theme-constants tests).

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: succeeds with no type or CSS errors.

- [ ] **Step 4: Manual visual checklist (run `pnpm dev`, open http://localhost:3000)**

Verify on the dashboard + one section page, in both light and dark mode (toggle in Settings → Appearance):
- [ ] No frosted-glass surfaces remain anywhere; cards are flat with hairline borders.
- [ ] Brand accent is clay (not green); accent appears only on primary actions / active nav / focus ring.
- [ ] Numbers render with tabular figures (digits align; toggle a value and columns don't shift).
- [ ] Background is warm off-white (light) / warm near-black (dark) — not pure white/black.
- [ ] Text contrast is comfortable (AA) in both modes.
- [ ] No console errors; no horizontal scroll at 375px width.

- [ ] **Step 5: Commit any checklist fixes, then mark the phase done**

```bash
git add -A
git commit -m "chore: Phase 1 foundation verification fixes" || echo "nothing to fix"
```

---

## Notes for later phases (not this plan)

- The legacy `data-font="sans"` now resolves to Hanken; `FONT_META.sans` label in `constants.ts` still says "Jakarta" — update the Settings font-picker copy in the Phase 5 (Settings) plan, not here.
- The per-section **Setup tab**, **Today action hub**, grouped **life-area nav**, **AI Studio**, and **custom-fields layer for AI-editable built-ins** are Phase 2+ — they build on these primitives.
- `Card`'s `padding` API and `variant` API are unchanged, so existing pages keep compiling; later phases migrate stat tiles to `StatBlock`.
