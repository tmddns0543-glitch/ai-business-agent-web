export type FixedCostInputValues = Record<string, number>;

export function calculateFixedCostInputSummary(
  values: FixedCostInputValues,
): number {
  return Object.values(values).reduce((total, value) => {
    return total + (Number.isFinite(value) && value >= 0 ? value : 0);
  }, 0);
}
