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

export interface WorkReport {
  rows: WorkReportRow[];
  routeRows: WorkReportRoute[];
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

  return { rows, routeRows, grossEarnings, gas, net };
}
