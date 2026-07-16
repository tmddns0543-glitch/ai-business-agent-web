export type LaborCostInputValues = Record<string, number>;

export function calculateLaborCostInputSummary(
  values: LaborCostInputValues,
): number {
  return Object.values(values).reduce((total, value) => {
    return total + (Number.isFinite(value) && value >= 0 ? value : 0);
  }, 0);
}
