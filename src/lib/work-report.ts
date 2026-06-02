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
