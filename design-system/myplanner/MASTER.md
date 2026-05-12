# Glass Planner — Design System v3

**Style:** Apple-inspired glassmorphism with layered translucency
**Modes:** Light + Dark (system-aware with manual toggle)
**Framework:** Next.js 16 + Tailwind CSS 4 + Framer Motion

---

## Color Modes

### Light Mode (`:root`)

| Role | Value | Variable |
|------|-------|----------|
| Background | `#F5F5F7` | `--background` |
| Text | `#1D1D1F` | `--text-primary` |
| Text muted | `#86868B` | `--text-muted` |
| Glass bg | `rgba(255,255,255,0.60)` | `--glass-bg` |
| Glass border | `rgba(0,0,0,0.06)` | `--glass-border` |
| Glass blur | `20px` | `--glass-blur` |
| Surfaces | 60% / 80% / 92% white | `--surface-1/2/3` |

### Dark Mode (`:root.dark`)

| Role | Value | Variable |
|------|-------|----------|
| Background | `#000000` (OLED black) | `--background` |
| Text | `#F5F5F7` | `--text-primary` |
| Text muted | `#86868B` | `--text-muted` |
| Glass bg | `rgba(28,28,30,0.72)` | `--glass-bg` |
| Glass border | `rgba(255,255,255,0.10)` | `--glass-border` |
| Glass blur | `24px` | `--glass-blur` |
| Surfaces | 4% / 7% / 10% white | `--surface-1/2/3` |

### Accent Themes

7 accent colors, mode-independent: amber (`#22C55E`), teal (`#14B8A6`), violet (`#A78BFA`), rose (`#FB7185`), sage (`#4ADE80`), ocean (`#60A5FA`), sunset (`#FB923C`).

Glow opacity: 8% in light, 12% in dark.

---

## Typography

- **Primary:** Plus Jakarta Sans (400-800)
- **Alternates:** Inter, Space Grotesk, Playfair Display, JetBrains Mono
- **Fallback:** `-apple-system, system-ui, sans-serif`
- **Headings:** Display font, `-0.025em` tracking
- **Page title:** `text-xl font-semibold`
- **Section header:** `text-sm font-semibold`
- **Stat value:** `2rem, 700 weight, -0.03em tracking`
- **Stat label:** `0.7rem, 600 weight, uppercase, 0.08em tracking`

---

## Surface Hierarchy

| Class | Purpose | Effect |
|-------|---------|--------|
| `.surface-card` | Standard glass cards | blur + saturation + border + `--shadow-card` |
| `.surface-elevated` | Modals, popovers | 32px blur, 200% saturation, `--shadow-elevated` |
| `.surface-inset` | Nested cards | `--surface-1` bg, subtle border |

Shadows are mode-aware (lighter in light mode, deeper in dark).

---

## Component Library

### Card (`@/components/ui/card`)
- Variants: `default`, `elevated`, `inset`
- Props: `interactive` (hover lift), `padding` (none/sm/md/lg)

### Button (`@/components/ui/button`)
- Variants: `primary`, `secondary`, `ghost`, `destructive`, `outline`
- Sizes: `sm`, `md`, `lg`, `icon`
- Active state: `scale(0.98)` press effect

### Modal (`@/components/ui/modal`)
- Framer Motion spring animation (scale 0.96 → 1)
- Sticky header, scrollable body
- `--backdrop-overlay` for backdrop

### FormInput / FormSelect / FormTextarea (`@/components/ui/form-input`)
- Uses `.form-input` CSS class
- Focus: accent border + 3px glow ring
- Supports `label`, `error` props

### ToggleSwitch (`@/components/ui/toggle-switch`)
- Apple-style pill toggle, spring-animated thumb
- Sizes: `sm`, `md`

### SegmentedControl (`@/components/ui/segmented-control`)
- Framer Motion `layoutId` sliding indicator
- Used for tab bars, filter groups

### Progress (`@/components/ui/progress`)
- Sizes: `sm` (1.5px), `md` (2px)
- Animated fill, optional label

### Skeleton (`@/components/ui/skeleton`)
- Mode-aware shimmer animation

---

## Layout

### Desktop
- **Sidebar:** Fixed 240px, macOS source-list style
  - Grouped navigation (Home, Sections, More)
  - Active item: accent bg 10% + 2px left accent bar
  - Group labels: 10px uppercase
- **Top bar:** 52px, page title + color mode toggle
- **Content:** `max-w-6xl mx-auto`, `px-6 py-4 md:px-8 md:py-6`

### Mobile
- **Bottom tab bar:** 56px + safe-area, 5 tabs (Home + 3 sections + More)
  - Active: filled pill indicator in accent color
- **More sheet:** Slide-up bottom sheet (half screen), drag handle, spring animation

---

## Animation

### Motion Variants (`@/lib/motion.ts`)
- `staggerContainer` — stagger children by 50ms
- `fadeUp` — opacity + 12px Y, spring (200/25)
- `scaleIn` — opacity + 0.96 scale, spring (300/30)
- `slideFromRight` — opacity + 16px X, spring (200/25)

### CSS Animations
- `slide-up-fade` — 0.4s, `cubic-bezier(0.22, 1, 0.36, 1)`
- `scale-in` — 0.25s, same curve
- `shimmer` — infinite background sweep
- Staggered delays: 50ms increments (delay-1 through delay-4)
- `@media (prefers-reduced-motion: reduce)` disables all

---

## Anti-Patterns

- No emojis as icons (use Lucide)
- No `cursor-pointer` omissions on interactive elements
- No layout-shifting hovers
- No low contrast text (4.5:1 minimum)
- No instant state changes (use 150-200ms transitions)
- No invisible focus states
- No hardcoded dark/light colors — always use CSS variables

---

## Checklist

- [ ] Uses CSS variables, not hardcoded colors
- [ ] Works in both light and dark mode
- [ ] Uses component library (Card, Button, FormInput, etc.)
- [ ] All icons from Lucide
- [ ] `cursor-pointer` on all interactive elements
- [ ] Hover/focus states with transitions
- [ ] Text contrast 4.5:1 minimum
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
