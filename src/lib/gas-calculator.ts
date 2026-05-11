export interface GasConfig {
  gasPriceCentsPerLitre: number;
  carConsumptionLPer100km: number;
}

export interface GasCalculation {
  totalKm: number;
  litresUsed: number;
  totalCostDollars: number;
  costPerKm: number;
}

export function calculateGasCost(
  totalKm: number,
  config: GasConfig
): GasCalculation {
  const litresUsed = (totalKm / 100) * config.carConsumptionLPer100km;
  const totalCostDollars = litresUsed * (config.gasPriceCentsPerLitre / 100);
  const costPerKm = totalKm > 0 ? totalCostDollars / totalKm : 0;

  return {
    totalKm,
    litresUsed: Math.round(litresUsed * 100) / 100,
    totalCostDollars: Math.round(totalCostDollars * 100) / 100,
    costPerKm: Math.round(costPerKm * 1000) / 1000,
  };
}
