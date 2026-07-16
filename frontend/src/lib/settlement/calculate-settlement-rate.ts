export function calculateExpectedSettlementRate(
  grossSales: number,
  expectedSettlement: number,
): number | null {
  if (
    !Number.isFinite(grossSales) ||
    !Number.isFinite(expectedSettlement) ||
    grossSales <= 0
  ) {
    return null;
  }

  return (expectedSettlement / grossSales) * 100;
}

export function formatExpectedSettlementRate(rate: number | null): string {
  return rate === null || !Number.isFinite(rate)
    ? "-"
    : `${rate.toFixed(1)}%`;
}
