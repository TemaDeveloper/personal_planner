import { describe, it, expect } from "vitest";
import { calculateGasCost } from "../gas-calculator";

describe("calculateGasCost", () => {
  const defaultConfig = {
    gasPriceCentsPerLitre: 210.2,
    carConsumptionLPer100km: 9.0,
  };

  it("calculates fuel cost for a given distance", () => {
    const result = calculateGasCost(100, defaultConfig);
    expect(result.totalKm).toBe(100);
    expect(result.litresUsed).toBe(9.0);
    expect(result.totalCostDollars).toBe(18.92);
    expect(result.costPerKm).toBeGreaterThan(0);
  });

  it("returns zero cost for zero distance", () => {
    const result = calculateGasCost(0, defaultConfig);
    expect(result.litresUsed).toBe(0);
    expect(result.totalCostDollars).toBe(0);
    expect(result.costPerKm).toBe(0);
  });

  it("scales linearly with distance", () => {
    const result50 = calculateGasCost(50, defaultConfig);
    const result100 = calculateGasCost(100, defaultConfig);
    expect(result100.litresUsed).toBeCloseTo(result50.litresUsed * 2, 1);
    expect(result100.totalCostDollars).toBeCloseTo(result50.totalCostDollars * 2, 1);
  });

  it("handles different gas prices", () => {
    const cheap = calculateGasCost(100, { ...defaultConfig, gasPriceCentsPerLitre: 100 });
    const expensive = calculateGasCost(100, { ...defaultConfig, gasPriceCentsPerLitre: 200 });
    expect(expensive.totalCostDollars).toBeCloseTo(cheap.totalCostDollars * 2, 1);
  });
});
