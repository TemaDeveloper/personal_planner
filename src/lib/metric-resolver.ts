// src/lib/metric-resolver.ts
//
// Resolves a DashboardMetric document into a human-readable { value, sub? } pair.
// Pure computation layer — no auth, no HTTP. Called from the GET route handler.
//
// Built-in metric computation reads the unified CustomEntry store (the same
// data the section pages write), resolving the section's seed template by slug.
// When a user has no CustomEntry rows for a section yet (pre-migration data),
// it falls back to the legacy collections so old data still shows.

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
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";
import Route from "@/lib/models/route";
import { calculateGasCost } from "@/lib/gas-calculator";
import { formatCurrency } from "@/lib/utils";
import {
  DEFAULT_CURRENCY,
  DEFAULT_ENABLED_SECTIONS,
  SECTIONS,
  type SectionId,
} from "@/lib/constants";
import type { IDashboardMetric } from "@/lib/models/dashboard-metric";

export interface ResolvedMetric {
  id: string;
  label: string;
  value: string;
  sub?: string;
  /** The metric's target section/template no longer exists (or is disabled). */
  stale?: boolean;
}

interface UserLike {
  workConfig?: {
    jobs?: { name: string; hourlyRate: number; active: boolean }[];
    gasPrice?: number;
    carConsumption?: number;
  };
  preferences?: { currency?: string };
  bills?: { amount: number; active: boolean }[];
  enabledSections?: string[];
}

/** Coerce an entry.data field to a finite number (0 otherwise). */
function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

type EntryDoc = { date: Date; data?: Record<string, unknown> };

/**
 * Fetches the user's CustomEntry rows for a built-in section by template slug.
 * Returns null when the template doesn't exist (fresh DB, not yet seeded) so
 * callers can fall back to the legacy collection.
 */
async function builtinEntries(
  userId: string,
  slug: string,
  range?: [Date, Date]
): Promise<EntryDoc[] | null> {
  const template = await SectionTemplate.findOne({ slug }).select("_id").lean();
  if (!template) return null;
  const query: Record<string, unknown> = { userId, templateId: template._id };
  if (range) query.date = { $gte: range[0], $lte: range[1] };
  return CustomEntry.find(query).select("date data").lean();
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

/**
 * Earnings for a set of work CustomEntry rows. Prefers the rate stored on the
 * entry (what the work section computes gross/net from); falls back to the
 * configured job rate matched by the entry's `job` field.
 */
function workEarnings(
  entries: EntryDoc[],
  jobs: { name: string; hourlyRate: number }[]
): number {
  return entries.reduce((sum, e) => {
    const hours = n(e.data?.hours);
    const rate =
      e.data?.hourly_rate != null
        ? n(e.data.hourly_rate)
        : jobs.find((j) => j.name === e.data?.job)?.hourlyRate ?? 0;
    return sum + hours * rate;
  }, 0);
}

/** Legacy WorkSession earnings (pre-migration fallback). */
async function legacyWorkEarnings(
  userId: string,
  range: [Date, Date],
  jobs: { name: string; hourlyRate: number }[]
): Promise<number> {
  const sessions = await WorkSession.find({
    userId,
    date: { $gte: range[0], $lte: range[1] },
  }).lean();
  return sessions.reduce((sum, s) => {
    const job = jobs.find((j) => j.name === s.jobName);
    return sum + s.hours * (job?.hourlyRate ?? 0);
  }, 0);
}

async function rangeEarnings(
  userId: string,
  range: [Date, Date],
  jobs: { name: string; hourlyRate: number }[]
): Promise<number> {
  const entries = await builtinEntries(userId, "work", range);
  if (entries && entries.length > 0) return workEarnings(entries, jobs);
  return legacyWorkEarnings(userId, range, jobs);
}

async function resolveBuiltin(
  metric: IDashboardMetric,
  userId: string,
  user: UserLike
): Promise<{ value: string; sub?: string }> {
  const currency = user.preferences?.currency ?? DEFAULT_CURRENCY;
  const jobs = (user.workConfig?.jobs ?? []).filter((j) => j.active);

  const [weekStart, weekEnd] = currentWeekRange();
  const [monthStart, monthEnd] = currentMonthRange();

  const fieldKey = metric.fieldKey;

  // ── work.weekEarnings ──────────────────────────────────────────────────────
  if (fieldKey === "weekEarnings") {
    const total = await rangeEarnings(userId, [weekStart, weekEnd], jobs);
    return { value: formatCurrency(total, currency) };
  }

  // ── work.monthEarnings ─────────────────────────────────────────────────────
  if (fieldKey === "monthEarnings") {
    const total = await rangeEarnings(userId, [monthStart, monthEnd], jobs);
    return { value: formatCurrency(total, currency) };
  }

  // ── gym.daysThisWeek ───────────────────────────────────────────────────────
  if (fieldKey === "daysThisWeek") {
    const entries = await builtinEntries(userId, "gym", [weekStart, weekEnd]);
    if (entries && entries.length > 0) {
      const days = new Set(
        entries
          .filter((e) => e.data?.attended !== false)
          .map((e) => e.date.toISOString().slice(0, 10))
      );
      return { value: String(days.size), sub: "days" };
    }
    const count = await GymAttendance.countDocuments({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
    });
    return { value: String(count), sub: "days" };
  }

  // ── study.minutesThisWeek ──────────────────────────────────────────────────
  if (fieldKey === "minutesThisWeek") {
    const entries = await builtinEntries(userId, "study", [weekStart, weekEnd]);
    let total: number;
    if (entries && entries.length > 0) {
      total = entries.reduce((sum, e) => sum + n(e.data?.minutes), 0);
    } else {
      const sessions = await StudySession.find({
        userId,
        date: { $gte: weekStart, $lte: weekEnd },
      }).lean();
      total = sessions.reduce((sum, s) => sum + s.minutes, 0);
    }
    const hours = (total / 60).toFixed(1);
    return { value: hours, sub: "hrs this week" };
  }

  // ── health.avgSleep ────────────────────────────────────────────────────────
  if (fieldKey === "avgSleep") {
    const entries = await builtinEntries(userId, "health", [weekStart, weekEnd]);
    if (entries && entries.length > 0) {
      const sleeps = entries
        .map((e) => Number(e.data?.sleep_hours))
        .filter((v) => Number.isFinite(v));
      if (sleeps.length === 0) return { value: "—" };
      const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
      return { value: avg.toFixed(1), sub: "hrs avg sleep" };
    }
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
    const monthRange: [Date, Date] = [monthStart, monthEnd];
    const [income, financeEntries, monthRoutes] = await Promise.all([
      rangeEarnings(userId, monthRange, jobs),
      builtinEntries(userId, "finances", monthRange),
      Route.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    ]);

    let totalExpenses: number;
    if (financeEntries && financeEntries.length > 0) {
      totalExpenses = financeEntries
        .filter((e) => e.data?.type !== "income")
        .reduce((s, e) => s + n(e.data?.amount), 0);
    } else {
      const monthExpenses = await Expense.find({
        userId,
        date: { $gte: monthStart, $lte: monthEnd },
      }).lean();
      totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
    }

    const bills = (user.bills ?? []).filter((b) => b.active);
    const totalBills = bills.reduce((s, b) => s + b.amount, 0);

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
 * True when the metric's target section no longer exists (custom template
 * deleted) or is disabled (built-in section removed from enabledSections).
 * Such metrics would render dead "—" tiles forever, so callers skip them.
 */
async function isStaleMetric(metric: IDashboardMetric, user: UserLike): Promise<boolean> {
  if (metric.sourceKind === "builtin") {
    if (!(SECTIONS as readonly string[]).includes(metric.sectionKey)) return false;
    const enabled = user.enabledSections ?? DEFAULT_ENABLED_SECTIONS;
    return !enabled.includes(metric.sectionKey as SectionId);
  }
  // custom-field: the section's template must still exist.
  const template = await SectionTemplate.findOne({ slug: metric.sectionKey })
    .select("_id")
    .lean();
  return !template;
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
    if (await isStaleMetric(metric, user)) {
      return { id, label, value: "—", stale: true };
    }
    const resolved =
      metric.sourceKind === "builtin"
        ? await resolveBuiltin(metric, userId, user)
        : await resolveCustomField(metric, userId);
    return { id, label, ...resolved };
  } catch {
    return { id, label, value: "—" };
  }
}
