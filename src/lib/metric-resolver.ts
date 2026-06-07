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

    default:
      return { value: "—" };
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
