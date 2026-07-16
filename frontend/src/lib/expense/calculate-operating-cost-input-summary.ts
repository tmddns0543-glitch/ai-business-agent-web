export type OperatingCostInputValues = Record<string, number>;

export function calculateOperatingCostInputSummary(
  values: OperatingCostInputValues,
): number {
  return Object.values(values).reduce((total, value) => {
    return total + (Number.isFinite(value) && value >= 0 ? value : 0);
  }, 0);
}
