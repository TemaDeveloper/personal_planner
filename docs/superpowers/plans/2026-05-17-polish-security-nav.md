# Polish, Security & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden all API routes with Zod validation and security headers, replace the mobile bottom tab bar with a hamburger dropdown menu from the top bar, and polish the entire frontend (animations, empty states, hover states, responsive fixes).

**Architecture:** Sequential — security fixes first (they may change API patterns), then nav refactor (touches layout files), then visual polish (touches page/component files). Each phase commits independently.

**Tech Stack:** Next.js 16, Zod 4, Framer Motion 12, Tailwind CSS 4, lucide-react

**Spec:** `docs/superpowers/specs/2026-05-17-polish-security-nav-design.md`

---

## File Structure

### New Files
- `src/lib/validations.ts` — Zod schemas for all API route inputs
- `src/components/layout/mobile-menu.tsx` — Hamburger dropdown menu (replaces mobile-nav.tsx)
- `src/components/ui/empty-state.tsx` — Reusable empty state component
- `src/components/ui/page-transition.tsx` — Framer Motion page transition wrapper

### Modified Files
- `next.config.ts` — Security headers
- `middleware.ts` — Add `/sections/:path*` to matcher
- `src/app/api/auth/register/route.ts` — Zod validation
- `src/app/api/habits/route.ts` — Zod validation
- `src/app/api/journal/route.ts` — Zod validation
- `src/app/api/goals/route.ts` — Zod validation
- `src/app/api/health/route.ts` — Zod validation
- `src/app/api/reading/route.ts` — Zod validation
- `src/app/api/shopping/route.ts` — Zod validation
- `src/app/api/housework/route.ts` — Zod validation
- `src/app/api/mealprep/route.ts` — Zod validation
- `src/app/api/expenses/route.ts` — Zod validation
- `src/app/api/routes/route.ts` — Zod validation
- `src/app/api/work/sessions/route.ts` — Zod validation
- `src/app/api/gym/workouts/route.ts` — Zod validation
- `src/app/api/study/sessions/route.ts` — Zod validation
- `src/app/api/study/homework/route.ts` — Zod validation
- `src/app/api/study/academic/route.ts` — Zod validation
- `src/app/api/hobbies/sessions/route.ts` — Zod validation
- `src/app/api/hobbies/projects/route.ts` — Zod validation
- `src/app/api/sections/[slug]/entries/route.ts` — Zod validation
- `src/app/api/user/preferences/route.ts` — Zod validation
- `src/app/api/user/profile/route.ts` — Zod validation
- `src/components/layout/top-bar.tsx` — Add hamburger button + import MobileMenu
- `src/app/(app)/layout.tsx` — Remove MobileNav import/usage
- `src/app/(app)/gym/page.tsx` — Empty state, polish
- `src/app/(app)/habits/page.tsx` — Empty state, polish
- `src/app/(app)/goals/page.tsx` — Empty state, polish
- `src/app/(app)/reading/page.tsx` — Empty state, polish
- `src/app/(app)/journal/page.tsx` — Empty state, polish
- `src/app/(app)/shopping/page.tsx` — Empty state, polish
- `src/app/(app)/study/page.tsx` — Empty state, polish
- `src/app/(app)/hobbies/page.tsx` — Empty state, polish
- `src/app/(app)/housework/page.tsx` — Empty state, polish
- `src/app/(app)/health/page.tsx` — Empty state, polish
- `src/app/(app)/mealprep/page.tsx` — Empty state, polish
- `src/app/(app)/finances/page.tsx` — Polish
- `src/app/(app)/export/page.tsx` — Polish
- `src/components/ui/button.tsx` — Add hover/focus state polish
- `src/components/ui/card.tsx` — Add hover state for interactive cards

### Deleted Files
- `src/components/layout/mobile-nav.tsx` — Replaced by mobile-menu.tsx

---

## Phase 1: Security

### Task 1: Add security headers to next.config.ts

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add security headers**

```typescript
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Add missing route to middleware matcher**

In `middleware.ts`, the matcher is missing `/sections/:path*` for custom section pages. Add it:

```typescript
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/work/:path*",
    "/gym/:path*",
    "/finances/:path*",
    "/habits/:path*",
    "/study/:path*",
    "/hobbies/:path*",
    "/housework/:path*",
    "/health/:path*",
    "/goals/:path*",
    "/reading/:path*",
    "/journal/:path*",
    "/shopping/:path*",
    "/mealprep/:path*",
    "/sections/:path*",
    "/settings/:path*",
    "/export/:path*",
    "/onboarding",
  ],
};
```

- [ ] **Step 3: Verify no env var leakage**

Run: `grep -r "NEXT_PUBLIC_" src/ --include="*.ts" --include="*.tsx" | head -20`

Expected: No matches (confirmed — no `NEXT_PUBLIC_` vars exist). Also verify `.gitignore` includes `.env.local`:

Run: `grep "env.local" .gitignore`

Expected: `.env.local` is listed.

- [ ] **Step 4: Run dependency audit**

Run: `pnpm audit`

Review output. Fix any vulnerabilities with `pnpm audit --fix` if safe upgrades are available.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts middleware.ts
git commit -m "security: add response headers and fix middleware matcher coverage"
```

---

### Task 2: Create Zod validation schemas

**Files:**
- Create: `src/lib/validations.ts`

- [ ] **Step 1: Create the validations file**

```typescript
import { z } from "zod";

// -- Helpers --

/** Coerce to string to prevent MongoDB operator injection from query params */
export const safeString = z.string().max(500);
export const safeId = z.string().min(1).max(100);

// -- Auth --

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(200),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

// -- Habits --

export const createHabitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  emoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
});

export const toggleHabitLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
});

// -- Journal --

export const createJournalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  content: z.string().min(1, "Content is required").max(10000),
  mood: z.number().int().min(1).max(5).optional(),
});

// -- Goals --

const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  completed: z.boolean().optional(),
});

export const createGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  targetDate: z.string().optional(),
  category: z.enum(["personal", "career", "health", "financial"]).optional(),
  milestones: z.array(milestoneSchema).max(50).optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  targetDate: z.string().nullable().optional(),
  category: z.enum(["personal", "career", "health", "financial"]).optional(),
  milestones: z.array(milestoneSchema).max(50).optional(),
});

// -- Health --

export const createHealthSchema = z.object({
  date: z.string().min(1, "Date is required"),
  waterLiters: z.number().min(0).max(20).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  weight: z.number().min(0).max(1000).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

// -- Reading --

export const createBookSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  author: z.string().max(200).optional(),
  totalPages: z.number().int().min(1).max(50000).optional(),
  currentPage: z.number().int().min(0).max(50000).optional(),
  status: z.enum(["reading", "completed", "want-to-read", "dropped"]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
});

// -- Shopping --

const shoppingItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().min(0).max(10000).optional(),
  price: z.number().min(0).max(1000000).optional(),
  checked: z.boolean().optional(),
});

export const createShoppingSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  items: z.array(shoppingItemSchema).max(200).optional(),
});

// -- Housework --

export const createHouseworkSchema = z.object({
  date: z.string().min(1, "Date is required"),
  task: z.string().min(1, "Task is required").max(200),
  completed: z.boolean().optional(),
  recurring: z.boolean().optional(),
});

// -- Meal Prep --

const mealSchema = z.object({
  type: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
});

export const createMealPlanSchema = z.object({
  date: z.string().min(1, "Date is required"),
  meals: z.array(mealSchema).max(20),
});

// -- Expenses --

export const createExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.number().min(0, "Amount must be positive").max(10000000),
  category: z.string().min(1, "Category is required").max(100),
  description: z.string().max(500).optional(),
  jobName: z.string().max(100).optional(),
  reimbursable: z.boolean().optional(),
});

// -- Routes --

export const createRouteSchema = z.object({
  date: z.string().min(1, "Date is required"),
  distanceKm: z.number().min(0).max(100000),
  description: z.string().max(500).optional(),
  jobName: z.string().max(100).optional(),
});

// -- Work Sessions --

export const createWorkSessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z.number().min(0).max(24),
  jobName: z.string().min(1, "Job name is required").max(100),
  notes: z.string().max(1000).optional(),
});

// -- Gym --

export const createWorkoutSchema = z.object({
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(1000).optional(),
});

// -- Study --

export const createStudySessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  subject: z.string().min(1, "Subject is required").max(100),
  minutes: z.number().int().min(1).max(1440),
  notes: z.string().max(1000).optional(),
});

export const createHomeworkSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100),
  title: z.string().min(1, "Title is required").max(300),
  dueDate: z.string().optional(),
  completed: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const createAcademicSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(100),
  type: z.enum(["test", "quiz", "assignment", "lab", "other"]),
  title: z.string().min(1, "Title is required").max(300),
  date: z.string().optional(),
  grade: z.string().max(20).optional(),
  weight: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

// -- Hobbies --

export const createHobbySessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hobby: z.string().min(1, "Hobby is required").max(100),
  minutes: z.number().int().min(1).max(1440),
  notes: z.string().max(1000).optional(),
  projectId: z.string().max(100).optional(),
});

export const createHobbyProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  hobby: z.string().min(1, "Hobby is required").max(100),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
});

// -- Custom Sections --

export const createCustomEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  data: z.record(z.unknown()).optional(),
});

// -- Query Params (prevent operator injection) --

export const dateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional(),
});

export const statusCategoryQuery = z.object({
  status: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations.ts
git commit -m "security: add Zod validation schemas for all API inputs"
```

---

### Task 3: Apply Zod validation to all API POST routes

**Files:**
- Modify: All API `route.ts` files that use `req.json()`

For each API route that accepts a POST body, the pattern is the same. Replace the manual validation with Zod. Here is the exact change pattern, shown for representative routes. **Apply this same pattern to all 35 routes that call `req.json()`.**

- [ ] **Step 1: Update registration route**

In `src/app/api/auth/register/route.ts`, replace lines 6-15:

```typescript
// OLD:
const { name, email, password } = await req.json();
if (!name || !email || !password) {
  return NextResponse.json({ error: "..." }, { status: 400 });
}
if (password.length < 6) {
  return NextResponse.json({ error: "..." }, { status: 400 });
}

// NEW:
import { registerSchema } from "@/lib/validations";

const body = await req.json();
const parsed = registerSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.issues[0]?.message ?? "Invalid input" },
    { status: 400 }
  );
}
const { name, email, password } = parsed.data;
```

- [ ] **Step 2: Update habits POST route**

In `src/app/api/habits/route.ts`, replace the POST body parsing (lines 67-70):

```typescript
import { createHabitSchema } from "@/lib/validations";

// Replace:
const body = await req.json();
const { name, emoji, color } = body;
if (!name) { ... }

// With:
const body = await req.json();
const parsed = createHabitSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.issues[0]?.message ?? "Invalid input" },
    { status: 400 }
  );
}
const { name, emoji, color } = parsed.data;
```

- [ ] **Step 3: Update journal POST route**

In `src/app/api/journal/route.ts`, same pattern with `createJournalSchema`.

- [ ] **Step 4: Update goals POST route**

In `src/app/api/goals/route.ts`, same pattern with `createGoalSchema`.

- [ ] **Step 5: Update all remaining POST routes**

Apply the same Zod validation pattern to these routes (use the corresponding schema from `validations.ts`):

| Route | Schema |
|-------|--------|
| `api/health/route.ts` | `createHealthSchema` |
| `api/reading/route.ts` | `createBookSchema` |
| `api/shopping/route.ts` | `createShoppingSchema` |
| `api/housework/route.ts` | `createHouseworkSchema` |
| `api/mealprep/route.ts` | `createMealPlanSchema` |
| `api/expenses/route.ts` | `createExpenseSchema` |
| `api/routes/route.ts` | `createRouteSchema` |
| `api/work/sessions/route.ts` | `createWorkSessionSchema` |
| `api/gym/workouts/route.ts` | `createWorkoutSchema` |
| `api/study/sessions/route.ts` | `createStudySessionSchema` |
| `api/study/homework/route.ts` | `createHomeworkSchema` |
| `api/study/academic/route.ts` | `createAcademicSchema` |
| `api/hobbies/sessions/route.ts` | `createHobbySessionSchema` |
| `api/hobbies/projects/route.ts` | `createHobbyProjectSchema` |
| `api/sections/[slug]/entries/route.ts` | `createCustomEntrySchema` |
| `api/habits/[id]/log/route.ts` | `toggleHabitLogSchema` |

For PATCH/PUT routes in `[id]/route.ts` files, use `.partial()` on the create schema or the specific update schema (e.g., `updateGoalSchema` for goals).

- [ ] **Step 6: Add String() coercion on query params**

For all GET routes that use `searchParams.get()`, ensure values are coerced to string before use in MongoDB queries. Example in `src/app/api/goals/route.ts`:

```typescript
// OLD:
const status = searchParams.get("status");
if (status) filter.status = status;

// NEW:
const status = searchParams.get("status");
if (status) filter.status = String(status);
```

Apply to all 20 files that use `searchParams.get()`.

- [ ] **Step 7: Verify the app builds**

Run: `pnpm build`

Expected: Build succeeds with no type errors.

- [ ] **Step 8: Run existing tests**

Run: `pnpm test`

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/
git commit -m "security: add Zod validation to all API routes and sanitize query params"
```

---

## Phase 2: Navigation Refactor

### Task 4: Create the mobile hamburger menu component

**Files:**
- Create: `src/components/layout/mobile-menu.tsx`

- [ ] **Step 1: Create the MobileMenu component**

```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Download,
  LogOut,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { useSections } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { enabledSections, customSections } = useSections();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const sectionItems = useMemo(
    () => [
      ...enabledSections.map((id) => ({
        href: SECTION_META[id].href,
        icon: ICON_MAP[SECTION_META[id].icon] || ICON_MAP.Briefcase,
        label: SECTION_META[id].label,
      })),
      ...customSections
        .filter((cs) => cs.enabled)
        .map((cs) => ({
          href: `/sections/${cs.slug}`,
          icon: ICON_MAP[cs.icon] || ICON_MAP.Star,
          label: cs.name,
        })),
    ],
    [enabledSections, customSections]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-[var(--backdrop-overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Dropdown panel */}
          <motion.div
            className="md:hidden fixed top-13 left-0 right-0 z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <div
              className="mx-3 rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
              style={{
                background: "var(--surface-3)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                maxHeight: "70vh",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Menu
                </p>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface-1)] transition-colors"
                >
                  <X size={16} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Nav items */}
              <div className="px-3 pb-2 overflow-y-auto" style={{ maxHeight: "calc(70vh - 100px)" }}>
                {/* Dashboard */}
                <MenuLink
                  href="/dashboard"
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={isActive("/dashboard")}
                  onClick={onClose}
                />

                {/* Divider */}
                <div className="my-2 mx-2 border-t border-[var(--border-subtle)]" />

                {/* Sections */}
                {sectionItems.map((item) => (
                  <MenuLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(item.href)}
                    onClick={onClose}
                  />
                ))}

                {/* Divider */}
                <div className="my-2 mx-2 border-t border-[var(--border-subtle)]" />

                {/* Bottom items */}
                <MenuLink
                  href="/settings"
                  icon={Settings}
                  label="Settings"
                  active={isActive("/settings")}
                  onClick={onClose}
                />
                <MenuLink
                  href="/export"
                  icon={Download}
                  label="Export"
                  active={isActive("/export")}
                  onClick={onClose}
                />

                {/* Sign out */}
                <button
                  onClick={() => {
                    onClose();
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  <LogOut size={18} className="flex-shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>

              {/* Bottom safe area padding */}
              <div className="h-2" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="relative flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent-glow)" : undefined,
        color: active ? "var(--accent-color)" : "var(--text-muted)",
      }}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[var(--accent-color)]" />
      )}
      <Icon size={18} className="flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/mobile-menu.tsx
git commit -m "feat: add mobile hamburger dropdown menu component"
```

---

### Task 5: Integrate hamburger into TopBar and remove MobileNav

**Files:**
- Modify: `src/components/layout/top-bar.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Delete: `src/components/layout/mobile-nav.tsx`

- [ ] **Step 1: Update TopBar to include hamburger button and MobileMenu**

Replace `src/components/layout/top-bar.tsx` entirely:

```tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon, Monitor, Menu } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useSections } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";
import type { ColorMode } from "@/lib/constants";
import { MobileMenu } from "./mobile-menu";

const MODE_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

const MODES: ColorMode[] = ["system", "light", "dark"];

function getPageTitle(pathname: string, enabledSections: string[]): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/export") return "Export";

  for (const id of enabledSections) {
    const meta = SECTION_META[id as keyof typeof SECTION_META];
    if (meta && pathname.startsWith(meta.href)) return meta.label;
  }

  if (pathname.startsWith("/sections/")) {
    const slug = pathname.split("/").pop();
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Section";
  }

  return "Planner";
}

export function TopBar() {
  const pathname = usePathname();
  const { preferences, updatePreferences } = useTheme();
  const { enabledSections } = useSections();
  const title = getPageTitle(pathname, enabledSections as string[]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between h-13 px-4 md:px-8 border-b border-[var(--border-subtle)] bg-[var(--background)]/80 backdrop-blur-lg sticky top-0 z-30">
        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={18} className="text-[var(--text-primary)]" />
          </button>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h1>
        </div>

        {/* Right: color mode toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)]">
          {MODES.map((mode) => {
            const Icon = MODE_ICONS[mode];
            const isActive = preferences.colorMode === mode;
            return (
              <button
                key={mode}
                onClick={() => updatePreferences({ colorMode: mode })}
                className="relative flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150"
                style={{
                  background: isActive ? "var(--glass-bg)" : undefined,
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: isActive ? "var(--shadow-sm)" : undefined,
                }}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </header>

      {/* Mobile dropdown menu */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Remove MobileNav from app layout**

In `src/app/(app)/layout.tsx`, make these changes:

1. Remove the import: `import { MobileNav } from "@/components/layout/mobile-nav";`
2. Remove `<MobileNav />` from the JSX (line 63)
3. Remove the bottom padding that was needed for the bottom nav

The updated layout JSX (lines 52-67):

```tsx
return (
  <SectionsProvider initialSections={enabledSections} initialCustomSections={customSections}>
    <div className="min-h-screen flex">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  </SectionsProvider>
);
```

- [ ] **Step 3: Delete mobile-nav.tsx**

```bash
rm src/components/layout/mobile-nav.tsx
```

- [ ] **Step 4: Verify no remaining imports of mobile-nav**

Run: `grep -r "mobile-nav" src/ --include="*.ts" --include="*.tsx"`

Expected: No matches.

- [ ] **Step 5: Verify the app builds**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace bottom tab bar with hamburger dropdown menu

Remove mobile-nav.tsx bottom tab bar. Add hamburger icon to top bar
that opens a slide-down dropdown panel with all nav items."
```

---

## Phase 3: Frontend Polish

### Task 6: Create reusable empty state and page transition components

**Files:**
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/page-transition.tsx`

- [ ] **Step 1: Create EmptyState component**

```tsx
import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: "var(--accent-glow)" }}
      >
        <Icon size={24} style={{ color: "var(--accent-color)" }} />
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create PageTransition component**

```tsx
"use client";

import { motion } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/empty-state.tsx src/components/ui/page-transition.tsx
git commit -m "feat: add reusable EmptyState and PageTransition components"
```

---

### Task 7: Add empty states and PageTransition to all section pages

**Files:**
- Modify: All page files in `src/app/(app)/*/page.tsx`

This task is the bulk of the polish. For each section page, wrap the content in `<PageTransition>` and add an `<EmptyState>` where there's no data. The pattern is the same — here are representative examples.

- [ ] **Step 1: Polish gym page**

In `src/app/(app)/gym/page.tsx`, the page already renders a calendar grid. It needs `PageTransition` wrapping. The page is server-rendered, so wrap the return in `PageTransition` from a client boundary. If the page is already client-side (`"use client"`), simply wrap the outermost `<div>` in `<PageTransition>`.

For pages that are server components, add the `animate-slide-up` class to the outermost div (which already exists on the dashboard page as a pattern).

- [ ] **Step 2: Add empty states to each section**

For each section page, find the "no data" condition and replace it with `<EmptyState>`. Pattern:

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Target } from "lucide-react"; // Use appropriate icon

// Where there's currently no empty state or a plain text message:
{goals.length === 0 ? (
  <EmptyState
    icon={Target}
    title="No goals yet"
    description="Set your first goal and track your progress with milestones."
    actionLabel="Add Goal"
    onAction={() => setShowModal(true)}
  />
) : (
  // existing content
)}
```

Apply to each section with the appropriate icon and copy:

| Section | Icon | Title | Description |
|---------|------|-------|-------------|
| Gym | `Dumbbell` | "No workouts this month" | "Tap any day on the calendar to log a workout." |
| Habits | `Flame` | "No habits yet" | "Start building habits — add your first one to track daily." |
| Goals | `Target` | "No goals yet" | "Set your first goal and track progress with milestones." |
| Reading | `BookOpen` | "No books yet" | "Add a book you're reading or want to read." |
| Journal | `NotebookPen` | "No entries this month" | "Write your first journal entry to start reflecting." |
| Shopping | `ShoppingCart` | "No shopping lists" | "Create a list to keep track of what you need." |
| Study | `GraduationCap` | "No study sessions yet" | "Log your first study session to start tracking." |
| Hobbies | `Palette` | "No hobby sessions yet" | "Log time spent on your hobbies and projects." |
| Housework | `Home` | "Nothing logged today" | "Add your chores and tasks for today." |
| Health | `Heart` | "No health logs yet" | "Start logging water, sleep, weight, and mood." |
| Meal Prep | `UtensilsCrossed` | "No meal plans this week" | "Plan your meals for the week ahead." |

- [ ] **Step 3: Verify the app builds**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/
git commit -m "polish: add empty states and page transitions to all section pages"
```

---

### Task 8: Polish interactive states and UI components

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: Various section pages for hover/focus states

- [ ] **Step 1: Polish Button hover states**

The button already has `hover:brightness-110` and `active:scale-[0.98]`. Add a subtle transition for the outline variant and ensure ghost has visible hover:

In `src/components/ui/button.tsx`, update the outline variant:

```typescript
outline:
  "border border-[var(--border-subtle)] text-foreground bg-transparent hover:bg-[var(--surface-1)]",
```

- [ ] **Step 2: Polish Card interactive hover**

In `src/components/ui/card.tsx`, add a hover transform for interactive cards:

```tsx
className={cn(
  variantClasses[variant],
  interactive && "interactive cursor-pointer hover:scale-[1.01] transition-transform duration-150",
  paddingClasses[padding],
  className
)}
```

- [ ] **Step 3: Add aria-labels to icon-only buttons across pages**

Search for icon-only buttons missing `aria-label`:

```bash
grep -rn "size=\"icon\"" src/ --include="*.tsx" | head -20
```

Add `aria-label` to any icon-only buttons found. This also fixes issue #25 (accessibility: Missing aria-labels on icon-only buttons).

- [ ] **Step 4: Verify the app builds**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ src/app/
git commit -m "polish: improve button/card hover states and add missing aria-labels"
```

---

### Task 9: Responsive fixes and final visual consistency pass

**Files:**
- Modify: Various pages as needed

- [ ] **Step 1: Check spacing consistency**

Verify all section pages use consistent padding. The app layout already provides `px-6 py-4 md:px-8 md:py-6` via the content wrapper in `layout.tsx:58`. Individual pages should NOT add their own outer padding — check for any that do and remove the duplication.

Run: `grep -rn "px-6 py-4\|px-8 py-6" src/app/\(app\)/ --include="*.tsx" | head -20`

Remove any duplicate padding wrappers found in page components.

- [ ] **Step 2: Check for text overflow issues**

Look for long text without truncation in cards/lists:

```bash
grep -rn "truncate\|overflow-hidden\|text-ellipsis" src/components/ --include="*.tsx" | wc -l
```

Add `truncate` class to section/habit/goal names that could overflow on small screens. Common pattern:

```tsx
<span className="truncate">{longName}</span>
```

- [ ] **Step 3: Verify modal positioning on small screens**

The Modal component (`src/components/ui/modal.tsx`) uses `p-4` for screen padding and `max-h-[80vh]` for height. This is correct for mobile. Verify `max-w-sm` default doesn't overflow on 375px screens (375 - 32 = 343px, `max-w-sm` = 384px — this could overflow). Fix:

In `src/components/ui/modal.tsx`, the container already has `p-4` and `w-full` which constrains properly. No change needed if `max-w-sm` respects the `w-full` parent constraint (it does in CSS — `max-width` doesn't override `width: 100%` when the parent is smaller).

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`

Expected: All tests pass.

- [ ] **Step 5: Verify the full app builds**

Run: `pnpm build`

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "polish: fix spacing consistency, truncation, and responsive edge cases"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run lint**

Run: `pnpm lint`

Fix any lint errors.

- [ ] **Step 2: Run tests**

Run: `pnpm test`

All should pass.

- [ ] **Step 3: Production build**

Run: `pnpm build`

Build should succeed.

- [ ] **Step 4: Push to remote**

```bash
git push origin main
```
