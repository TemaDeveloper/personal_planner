import { describe, it, expect } from "vitest";
import { buildWorkReport } from "@/lib/work-report";

const GAS = { gasPriceCentsPerLitre: 200, carConsumptionLPer100km: 10 };

describe("buildWorkReport", () => {
  it("computes per-row total as hours x the job's hourly rate", () => {
    const report = buildWorkReport({
      sessions: [
        { jobName: "Wuzzals", date: "2026-05-20", hours: 8, note: "a" },
        { jobName: "Advapay", date: "2026-05-21", hours: 5, note: "" },
      ],
      jobs: [
        { name: "Wuzzals", hourlyRate: 25 },
        { name: "Advapay", hourlyRate: 40 },
      ],
      routes: [],
      ...GAS,
    });

    expect(report.rows[0].total).toBe(200); // 8 * 25
    expect(report.rows[1].total).toBe(200); // 5 * 40
    expect(report.grossEarnings).toBe(400);
  });

  it("treats missing job or zero rate as zero earnings", () => {
    const report = buildWorkReport({
      sessions: [
        { jobName: "Unknown", date: "2026-05-20", hours: 8 },
        { jobName: "Volunteer", date: "2026-05-21", hours: 3 },
      ],
      jobs: [{ name: "Volunteer", hourlyRate: 0 }],
      routes: [],
      ...GAS,
    });

    expect(report.rows[0].total).toBe(0);
    expect(report.rows[1].total).toBe(0);
    expect(report.grossEarnings).toBe(0);
  });

  it("calculates gas cost across all routes for all time", () => {
    const report = buildWorkReport({
      sessions: [],
      jobs: [],
      routes: [
        { date: "2026-05-20", origin: "Home", destination: "Site A", distanceKm: 50 },
        { date: "2026-05-21", origin: "Home", destination: "Site B", distanceKm: 50 },
      ],
      ...GAS,
    });

    // 100 km @ 10 L/100km = 10 L; 10 L @ $2.00/L = $20.00
    expect(report.gas.totalKm).toBe(100);
    expect(report.gas.litresUsed).toBe(10);
    expect(report.gas.totalCostDollars).toBe(20);
    expect(report.routeRows).toHaveLength(2);
  });

  it("computes net as gross earnings minus gas cost", () => {
    const report = buildWorkReport({
      sessions: [{ jobName: "Wuzzals", date: "2026-05-20", hours: 4, note: "" }],
      jobs: [{ name: "Wuzzals", hourlyRate: 25 }],
      routes: [{ date: "2026-05-20", origin: "Home", destination: "Site", distanceKm: 50 }],
      ...GAS,
    });

    // earnings 100, gas: 50km -> 5L -> $10
    expect(report.grossEarnings).toBe(100);
    expect(report.gas.totalCostDollars).toBe(10);
    expect(report.net).toBe(90);
  });

  it("handles empty input without dividing by zero", () => {
    const report = buildWorkReport({ sessions: [], jobs: [], routes: [], ...GAS });
    expect(report.grossEarnings).toBe(0);
    expect(report.gas.totalKm).toBe(0);
    expect(report.gas.totalCostDollars).toBe(0);
    expect(report.net).toBe(0);
  });
});
