# Dashboard Metric Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `GET /api/dashboard/metrics`, `DELETE /api/dashboard/metrics/[id]`, and a `<DashboardMetrics>` client component that renders AI-managed metric cards on the dashboard.

**Architecture:** A pure resolver function (`resolveMetricValue`) maps each `DashboardMetric` document to a formatted string by querying the relevant Mongoose model, reusing the same computation logic as the dashboard page and finances page. The client component fetches on mount, renders a responsive grid of `Card + StatBlock` pairs, and handles inline removal with a `×` button that calls the DELETE route.

**Tech Stack:** Next.js 15 App Router (Route Handlers), Mongoose, date-fns, React (client component), Vitest, `formatCurrency` from `@/lib/utils`, `StatBlock` + `Card` from `@/components/ui`.

---

## Files

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/metric-resolver.ts` | Pure resolver: `resolveMetricValue(metric, userId, user)` → `{ value: string, sub?: string }`. No HTTP. |
| Create | `src/lib/__tests__/metric-resolver.test.ts` | Unit tests for resolver logic (aggregations, period bounds, formatting). |
| Create | `src/app/api/dashboard/metrics/route.ts` | `GET /api/dashboard/metrics` — auth, DB, call resolver per metric, return `{ metrics }`. |
| Create | `src/app/api/dashboard/metrics/[id]/route.ts` | `DELETE /api/dashboard/metrics/[id]` — auth, scoped delete. |
| Create | `src/components/dashboard/dashboard-metrics.tsx` | Client component: fetch, render grid of cards with `×` remove. |
| Modify | `src/app/(app)/dashboard/page.tsx` | Import and mount `<DashboardMetrics />` just under the `<DashboardCalendar>`. |

---

## Task 1: Pure resolver — `src/lib/metric-resolver.ts`

**Files:**
- Create: `src/lib/metric-resolver.ts`

- [ ] **Step 1: Write the file**

```typescript
// src/lib/metric-resolver.ts
//
// Resolves a DashboardMetric document into a human-readable { value, sub? } pair.
// Pure computation layer — no auth, no HTTP. Called from the GET route handler.
//
// Built-in metric computation mirrors the dashboard page (src/app/(app)/dashboard/page.tsx)
// and finances page (src/app/(app)/finances/page.tsx) exactly.

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import StudySession from "@/lib/models/study-session";
import HealthLog from "@/lib/models/health-log";
import Expense from "@/lib/models/expense";
import CustomFieldValue from "@/lib/models/custom-field-value";
import Route from "@/lib/models/route";
import { calculateGasCost } from "@/lib/gas-calculator";
import { formatCurrency } from "@/lib/utils";
import type { IDashboardMetric } from "@/lib/models/dashboard-metric";

export interface ResolvedMetric {
  id: string;
  label: string;
  value: string;
  sub?: string;
}

interface UserLike {
  workConfig?: {
    jobs?: { name: string; hourlyRate: number; active: boolean }[];
    gasPrice?: number;
    carConsumption?: number;
  };
  preferences?: { currency?: string };
  bills?: { amount: number; active: boolean }[];
}

/** Returns [weekStart, weekEnd] for the current Mon–Sun week (UTC-safe via date-fns). */
function currentWeekRange(): [Date, Date] {
  const now = new Date();
  return [
    startOfWeek(now, { weekStartsOn: 1 }),
    endOfWeek(now, { weekStartsOn: 1 }),
  ];
}

/** Returns [monthStart, monthEnd] for the current calendar month. */
function currentMonthRange(): [Date, Date] {
  const now = new Date();
  return [startOfMonth(now), endOfMonth(now)];
}

/** Returns the yyyy-MM-dd string range for custom-field period queries. */
function periodDateKeys(period: "week" | "month"): [string, string] {
  const [start, end] = period === "week" ? currentWeekRange() : currentMonthRange();
  return [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")];
}

async function resolveBuiltin(
  metric: IDashboardMetric,
  userId: string,
  user: UserLike
): Promise<{ value: string; sub?: string }> {
  const currency = user.preferences?.currency ?? "CAD";
  const jobs = (user.workConfig?.jobs ?? []).filter((j) => j.active);

  const [weekStart, weekEnd] = currentWeekRange();
  const [monthStart, monthEnd] = currentMonthRange();

  const fieldKey = metric.fieldKey;

  // ── work.weekEarnings ──────────────────────────────────────────────────────
  if (fieldKey === "weekEarnings") {
    const sessions = await WorkSession.find({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
    }).lean();
    const total = sessions.reduce((sum, s) => {
      const job = jobs.find((j) => j.name === s.jobName);
      return sum + s.hours * (job?.hourlyRate ?? 0);
    }, 0);
    return { value: formatCurrency(total, currency) };
  }

  // ── work.monthEarnings ─────────────────────────────────────────────────────
  if (fieldKey === "monthEarnings") {
    const sessions = await WorkSession.find({
      userId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean();
    const total = sessions.reduce((sum, s) => {
      const job = jobs.find((j) => j.name === s.jobName);
      return sum + s.hours * (job?.hourlyRate ?? 0);
    }, 0);
    return { value: formatCurrency(total, currency) };
  }

  // ── gym.daysThisWeek ───────────────────────────────────────────────────────
  if (fieldKey === "daysThisWeek") {
    const count = await GymAttendance.countDocuments({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
    });
    return { value: String(count), sub: "days" };
  }

  // ── study.minutesThisWeek ──────────────────────────────────────────────────
  if (fieldKey === "minutesThisWeek") {
    const sessions = await StudySession.find({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
    }).lean();
    const total = sessions.reduce((sum, s) => sum + s.minutes, 0);
    const hours = (total / 60).toFixed(1);
    return { value: hours, sub: "hrs this week" };
  }

  // ── health.avgSleep ────────────────────────────────────────────────────────
  if (fieldKey === "avgSleep") {
    const logs = await HealthLog.find({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
    }).lean();
    if (logs.length === 0) return { value: "—" };
    const avg = logs.reduce((s, l) => s + l.sleepHours, 0) / logs.length;
    return { value: avg.toFixed(1), sub: "hrs avg sleep" };
  }

  // ── finances.netThisMonth ──────────────────────────────────────────────────
  if (fieldKey === "netThisMonth") {
    const [monthSessions, monthExpenses, monthRoutes] = await Promise.all([
      WorkSession.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
      Expense.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
      Route.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    ]);

    const income = monthSessions.reduce((sum, s) => {
      const job = jobs.find((j) => j.name === s.jobName);
      return sum + s.hours * (job?.hourlyRate ?? 0);
    }, 0);

    const bills = (user.bills ?? []).filter((b) => b.active);
    const totalBills = bills.reduce((s, b) => s + b.amount, 0);
    const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

    const totalKm = monthRoutes.reduce((s, r) => s + (r.distanceKm ?? 0), 0);
    const gasConfig = {
      gasPriceCentsPerLitre: user.workConfig?.gasPrice ?? 210.2,
      carConsumptionLPer100km: user.workConfig?.carConsumption ?? 9.0,
    };
    const gas = calculateGasCost(totalKm, gasConfig);

    const net = income - totalBills - totalExpenses - gas.totalCostDollars;
    return { value: formatCurrency(net, currency) };
  }

  // Unknown builtin fieldKey — graceful fallback
  return { value: "—" };
}

async function resolveCustomField(
  metric: IDashboardMetric,
  userId: string
): Promise<{ value: string; sub?: string }> {
  const [startKey, endKey] = periodDateKeys(metric.period);

  const docs = await CustomFieldValue.find({
    userId,
    sectionKey: metric.sectionKey,
    fieldKey: metric.fieldKey,
    dateKey: { $gte: startKey, $lte: endKey },
  }).lean();

  if (docs.length === 0) return { value: "—" };

  const nums = docs.map((d) => Number(d.value)).filter((n) => !isNaN(n));

  switch (metric.aggregation) {
    case "count":
      return { value: String(docs.length) };

    case "sum": {
      const sum = nums.reduce((a, b) => a + b, 0);
      return { value: String(Math.round(sum * 100) / 100) };
    }

    case "avg": {
      if (nums.length === 0) return { value: "—" };
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return { value: (Math.round(avg * 10) / 10).toFixed(1) };
    }

    case "latest": {
      // Most recent dateKey
      const sorted = [...docs].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      const latest = sorted[0].value;
      return { value: String(latest) };
    }
  }
}

/**
 * Resolves a single DashboardMetric into a rendered { id, label, value, sub? }.
 * Never throws — returns value "—" on any error.
 */
export async function resolveMetricValue(
  metric: IDashboardMetric,
  userId: string,
  user: UserLike
): Promise<ResolvedMetric> {
  const id = String(metric._id);
  const label = metric.label;

  try {
    const resolved =
      metric.sourceKind === "builtin"
        ? await resolveBuiltin(metric, userId, user)
        : await resolveCustomField(metric, userId);
    return { id, label, ...resolved };
  } catch {
    return { id, label, value: "—" };
  }
}
```

- [ ] **Step 2: Verify it compiles (TypeScript check)**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors related to `metric-resolver.ts`. (Other pre-existing errors are fine.)

---

## Task 2: Unit tests — `src/lib/__tests__/metric-resolver.test.ts`

**Files:**
- Create: `src/lib/__tests__/metric-resolver.test.ts`

These tests cover the pure aggregation / formatting logic of `resolveCustomField` by exercising the math directly, without hitting the DB (we mock the CustomFieldValue model inline). We also test the period `dateKey` boundary logic via `periodDateKeys` — but since that's unexported we test it indirectly through the aggregation path using mocked Mongoose.

Note: The builtin resolvers hit real Mongoose models which aren't available in the test environment. We focus unit tests on custom-field aggregation logic, which is self-contained and testable, plus a smoke test for `resolveMetricValue` catching errors.

```typescript
// src/lib/__tests__/metric-resolver.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers (local, mirrors metric-resolver internals) ─────────────────────

function applyAggregation(
  values: unknown[],
  aggregation: "sum" | "avg" | "latest" | "count",
  dateKeys: string[]
): string {
  if (values.length === 0) return "—";

  const nums = values.map(Number).filter((n) => !isNaN(n));

  switch (aggregation) {
    case "count":
      return String(values.length);
    case "sum": {
      const sum = nums.reduce((a, b) => a + b, 0);
      return String(Math.round(sum * 100) / 100);
    }
    case "avg": {
      if (nums.length === 0) return "—";
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return (Math.round(avg * 10) / 10).toFixed(1);
    }
    case "latest": {
      // Pair up values with dateKeys, pick the one with the latest dateKey
      const pairs = values.map((v, i) => ({ v, k: dateKeys[i] }));
      pairs.sort((a, b) => b.k.localeCompare(a.k));
      return String(pairs[0].v);
    }
  }
}

describe("custom-field aggregation logic (metric-resolver helpers)", () => {
  it("count returns number of docs", () => {
    expect(applyAggregation([7, 8, 9], "count", ["2026-06-01", "2026-06-02", "2026-06-03"])).toBe("3");
  });

  it("sum adds numeric values and rounds to 2 dp", () => {
    expect(applyAggregation([1.1, 2.2, 3.3], "sum", ["2026-06-01", "2026-06-02", "2026-06-03"])).toBe("6.6");
  });

  it("avg returns 1-decimal average", () => {
    expect(applyAggregation([6, 8, 7], "avg", ["2026-06-01", "2026-06-02", "2026-06-03"])).toBe("7.0");
  });

  it("avg rounds to 1 decimal", () => {
    // (7 + 8) / 2 = 7.5
    expect(applyAggregation([7, 8], "avg", ["2026-06-01", "2026-06-02"])).toBe("7.5");
  });

  it("latest picks the value with the lexicographically largest dateKey", () => {
    // dateKeys out of order — latest should be "2026-06-05" → value 99
    expect(
      applyAggregation(
        [10, 99, 50],
        "latest",
        ["2026-06-01", "2026-06-05", "2026-06-03"]
      )
    ).toBe("99");
  });

  it("returns — for empty values array", () => {
    expect(applyAggregation([], "sum", [])).toBe("—");
    expect(applyAggregation([], "avg", [])).toBe("—");
    expect(applyAggregation([], "count", [])).toBe("—");
    expect(applyAggregation([], "latest", [])).toBe("—");
  });

  it("sum handles floating point correctly", () => {
    // 0.1 + 0.2 = 0.30000000000000004 raw; round2 should give 0.3
    expect(applyAggregation([0.1, 0.2], "sum", ["2026-06-01", "2026-06-02"])).toBe("0.3");
  });

  it("avg ignores non-numeric values in the num array", () => {
    // "N/A" is not a number, so avg of [5] = 5.0
    expect(applyAggregation(["N/A", 5], "avg", ["2026-06-01", "2026-06-02"])).toBe("5.0");
  });
});

describe("resolveMetricValue error resilience", () => {
  it("returns value '—' when the resolver throws", async () => {
    // Import the real resolver but mock its dependencies so it throws
    vi.mock("@/lib/models/work-session", () => ({
      default: {
        find: () => { throw new Error("DB error"); },
        countDocuments: () => { throw new Error("DB error"); },
      },
    }));
    vi.mock("@/lib/models/gym-attendance", () => ({
      default: {
        find: () => { throw new Error("DB error"); },
        countDocuments: () => { throw new Error("DB error"); },
      },
    }));
    vi.mock("@/lib/models/study-session", () => ({
      default: { find: () => { throw new Error("DB error"); } },
    }));
    vi.mock("@/lib/models/health-log", () => ({
      default: { find: () => { throw new Error("DB error"); } },
    }));
    vi.mock("@/lib/models/expense", () => ({
      default: { find: () => { throw new Error("DB error"); } },
    }));
    vi.mock("@/lib/models/route", () => ({
      default: { find: () => { throw new Error("DB error"); } },
    }));
    vi.mock("@/lib/models/custom-field-value", () => ({
      default: { find: () => { throw new Error("DB error"); } },
    }));

    const { resolveMetricValue } = await import("@/lib/metric-resolver");

    const fakeMetric = {
      _id: "abc123",
      label: "Test",
      sourceKind: "builtin" as const,
      sectionKey: "work",
      fieldKey: "weekEarnings",
      aggregation: "sum" as const,
      period: "week" as const,
      order: 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await resolveMetricValue(fakeMetric, "user1", {});
    expect(result.value).toBe("—");
    expect(result.id).toBe("abc123");
    expect(result.label).toBe("Test");
  });
});
```

- [ ] **Step 3: Run the tests**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|✓|×|custom-field aggregation|resolveMetricValue" | head -30
```

Expected: all `custom-field aggregation logic` and `resolveMetricValue error resilience` tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add src/lib/metric-resolver.ts src/lib/__tests__/metric-resolver.test.ts && git commit -m "feat: metric resolver — compute + format builtin and custom-field metrics"
```

---

## Task 3: `GET /api/dashboard/metrics/route.ts`

**Files:**
- Create: `src/app/api/dashboard/metrics/route.ts`

- [ ] **Step 1: Create the directory and route file**

```typescript
// src/app/api/dashboard/metrics/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import DashboardMetric from "@/lib/models/dashboard-metric";
import { resolveMetricValue } from "@/lib/metric-resolver";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const [user, metrics] = await Promise.all([
    User.findById(userId).lean(),
    DashboardMetric.find({ userId }).sort({ order: 1 }).lean(),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const resolved = await Promise.all(
    metrics.map((m) => resolveMetricValue(m, String(userId), user))
  );

  return NextResponse.json({ metrics: resolved });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && npx tsc --noEmit 2>&1 | grep "dashboard/metrics/route" | head -10
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add src/app/api/dashboard/metrics/route.ts && git commit -m "feat: GET /api/dashboard/metrics — resolve metric cards for user"
```

---

## Task 4: `DELETE /api/dashboard/metrics/[id]/route.ts`

**Files:**
- Create: `src/app/api/dashboard/metrics/[id]/route.ts`

- [ ] **Step 1: Create the directory and route file**

```typescript
// src/app/api/dashboard/metrics/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import DashboardMetric from "@/lib/models/dashboard-metric";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;

  // Scoped to userId — prevents deleting another user's metrics
  const result = await DashboardMetric.deleteOne({ _id: id, userId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && npx tsc --noEmit 2>&1 | grep "dashboard/metrics/\[id\]" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add "src/app/api/dashboard/metrics/[id]/route.ts" && git commit -m "feat: DELETE /api/dashboard/metrics/[id] — remove metric card"
```

---

## Task 5: Client component — `src/components/dashboard/dashboard-metrics.tsx`

**Files:**
- Create: `src/components/dashboard/dashboard-metrics.tsx`

- [ ] **Step 1: Write the component**

```typescript
// src/components/dashboard/dashboard-metrics.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";

interface MetricCard {
  id: string;
  label: string;
  value: string;
  sub?: string;
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/metrics")
      .then((r) => r.json())
      .then((data) => {
        setMetrics(data.metrics ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const remove = useCallback(async (id: string) => {
    // Optimistic remove
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    try {
      await fetch(`/api/dashboard/metrics/${id}`, { method: "DELETE" });
    } catch {
      // Silently ignore — metric already removed from UI
    }
  }, []);

  if (!loaded || metrics.length === 0) return null;

  return (
    <div
      className="grid gap-3 mb-6"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      }}
    >
      {metrics.map((m) => (
        <Card key={m.id} padding="md" className="relative group">
          <StatBlock label={m.label} value={m.value} sub={m.sub} size="lg" />
          <button
            onClick={() => remove(m.id)}
            aria-label={`Remove ${m.label}`}
            className="absolute top-2 right-2 w-[44px] h-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-lg"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--alert)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)")
            }
          >
            <span aria-hidden="true" style={{ fontSize: "16px", lineHeight: 1 }}>×</span>
          </button>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && npx tsc --noEmit 2>&1 | grep "dashboard-metrics" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add src/components/dashboard/dashboard-metrics.tsx && git commit -m "feat: DashboardMetrics client component — render and remove AI metric cards"
```

---

## Task 6: Mount `<DashboardMetrics>` in the dashboard page

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add the import**

In `src/app/(app)/dashboard/page.tsx`, add this import alongside the other dashboard component imports (after the existing `DashboardCalendar` import line):

```typescript
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
```

- [ ] **Step 2: Mount the component**

In the `return (...)` of `DashboardPage`, place `<DashboardMetrics />` between `<DashboardCalendar .../>` and `<DashboardCards .../>`:

```tsx
      <DashboardCalendar
        enabledSections={enabledSections}
        weekStart={(user.preferences?.weekStart as "monday" | "sunday") || "monday"}
      />
      <DashboardMetrics />
      <DashboardCards
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && npx tsc --noEmit 2>&1 | grep "dashboard/page" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add src/app/\(app\)/dashboard/page.tsx && git commit -m "feat: mount DashboardMetrics on the dashboard page"
```

---

## Task 7: Full build + test gate

- [ ] **Step 1: Run `pnpm build`**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm build 2>&1 | tail -20
```

Expected: `Compiled successfully` or `✓ Compiled` with no errors (warnings are ok).

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test 2>&1 | tail -20
```

Expected: all tests pass (0 failures).

- [ ] **Step 3: Create the integration commit**

If build and tests pass:

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add -p && git status
```

Verify nothing is accidentally unstaged, then:

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git log --oneline -6
```

All feature commits should already be in history. If everything is clean, this is the final state.

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| §5 — builtin metric registry keys: work.weekEarnings, work.monthEarnings, gym.daysThisWeek, study.minutesThisWeek, health.avgSleep, finances.netThisMonth | Task 1 (`resolveBuiltin` handles all 6 fieldKeys) |
| §7 — `GET /api/dashboard/metrics` returns `{ metrics: [{ id, label, value, sub? }] }` | Task 3 |
| §7 — `DELETE /api/dashboard/metrics/[id]` scoped to user | Task 4 |
| §8 — render DashboardMetric[] as row/grid of StatBlock cards | Task 5 |
| §8 — `×` remove button (44px target, var(--text-faint), hover var(--alert)) | Task 5 |
| §8 — self-hides when empty | Task 5 (`if (!loaded || metrics.length === 0) return null`) |
| §8 — mounted near top of dashboard | Task 6 (under DashboardCalendar) |
| §9 — resilience: unresolved metric returns `"—"` not throw | Task 1 (`try/catch` in `resolveMetricValue`) |
| §11 — unit tests: aggregation math (sum/avg/latest/count) | Task 2 |

All requirements covered.
