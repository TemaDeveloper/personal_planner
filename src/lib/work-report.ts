import { calculateGasCost, type GasCalculation } from "./gas-calculator";

export interface WorkReportSession {
  jobName: string;
  date: Date | string;
  hours: number;
  note?: string | null;
}

export interface WorkReportJob {
  name: string;
  hourlyRate: number;
}

export interface WorkReportRoute {
  date: Date | string;
  origin: string;
  destination: string;
  distanceKm: number;
}

export interface WorkReportRow {
  jobName: string;
  date: Date | string;
  hours: number;
  note: string;
  rate: number;
  total: number;
}

export interface WorkReportJobBreakdown {
  jobName: string;
  hours: number;
  rate: number;
  total: number;
}

export interface WorkReport {
  rows: WorkReportRow[];
  routeRows: WorkReportRoute[];
  /** Gross earnings split per job — the line items that sum to grossEarnings. */
  byJob: WorkReportJobBreakdown[];
  grossEarnings: number;
  gas: GasCalculation;
  net: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Combines work sessions, job hourly rates, and routes into a single report:
 * per-row earnings (hours x rate), gross earnings, gas cost for all routes, and net.
 * Pure function — no DB access — so it can be unit tested and reused by the Excel
 * export and the public share endpoints.
 */
export function buildWorkReport(input: {
  sessions: WorkReportSession[];
  jobs: WorkReportJob[];
  routes: WorkReportRoute[];
  gasPriceCentsPerLitre: number;
  carConsumptionLPer100km: number;
}): WorkReport {
  const rateByJob = new Map(input.jobs.map((j) => [j.name, j.hourlyRate]));

  let grossEarnings = 0;
  const rows: WorkReportRow[] = input.sessions.map((s) => {
    const rate = rateByJob.get(s.jobName) ?? 0;
    const total = round2(s.hours * rate);
    grossEarnings += total;
    return {
      jobName: s.jobName,
      date: s.date,
      hours: s.hours,
      note: s.note ?? "",
      rate,
      total,
    };
  });
  grossEarnings = round2(grossEarnings);

  // Aggregate per job so the breakdown can show where the gross came from.
  const byJobMap = new Map<string, WorkReportJobBreakdown>();
  for (const r of rows) {
    const existing = byJobMap.get(r.jobName);
    if (existing) {
      existing.hours = round2(existing.hours + r.hours);
      existing.total = round2(existing.total + r.total);
    } else {
      byJobMap.set(r.jobName, {
        jobName: r.jobName,
        hours: r.hours,
        rate: r.rate,
        total: r.total,
      });
    }
  }
  const byJob = [...byJobMap.values()].sort((a, b) => b.total - a.total);

  const totalKm = input.routes.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
  const gas = calculateGasCost(totalKm, {
    gasPriceCentsPerLitre: input.gasPriceCentsPerLitre,
    carConsumptionLPer100km: input.carConsumptionLPer100km,
  });

  const net = round2(grossEarnings - gas.totalCostDollars);

  const routeRows: WorkReportRoute[] = input.routes.map((r) => ({
    date: r.date,
    origin: r.origin,
    destination: r.destination,
    distanceKm: r.distanceKm,
  }));

  return { rows, routeRows, byJob, grossEarnings, gas, net };
}

export interface WorkReportMonth extends WorkReport {
  /** Sortable "YYYY-MM" key for the calendar month this report covers. */
  monthKey: string;
}

function monthKeyOf(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  // Session/route dates are stored as UTC midnight of the intended calendar
  // day (new Date("YYYY-MM-DD")). Reading them back with local getters would
  // shift dates near month boundaries into the wrong month on any server or
  // browser running behind UTC (e.g. all of North America) — use UTC getters
  // so the month always matches the date the user actually entered.
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Splits sessions and routes by calendar month and builds an independent
 * WorkReport for each one — its own rows, per-job breakdown, gas cost (from
 * that month's routes only), and net. Lets a multi-month share show one
 * fully self-contained card per month (e.g. to build a monthly invoice)
 * instead of a single all-time total. Sorted newest month first.
 */
export function buildMonthlyWorkReports(input: {
  sessions: WorkReportSession[];
  jobs: WorkReportJob[];
  routes: WorkReportRoute[];
  gasPriceCentsPerLitre: number;
  carConsumptionLPer100km: number;
}): WorkReportMonth[] {
  const monthKeys = new Set<string>();
  input.sessions.forEach((s) => monthKeys.add(monthKeyOf(s.date)));
  input.routes.forEach((r) => monthKeys.add(monthKeyOf(r.date)));

  return [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => ({
      monthKey,
      ...buildWorkReport({
        sessions: input.sessions.filter((s) => monthKeyOf(s.date) === monthKey),
        jobs: input.jobs,
        routes: input.routes.filter((r) => monthKeyOf(r.date) === monthKey),
        gasPriceCentsPerLitre: input.gasPriceCentsPerLitre,
        carConsumptionLPer100km: input.carConsumptionLPer100km,
      }),
    }));
}
