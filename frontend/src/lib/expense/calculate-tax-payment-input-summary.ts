export type TaxPaymentInputValues = Record<string, number>;

export function calculateTaxPaymentInputSummary(
  values: TaxPaymentInputValues,
): number {
  return Object.values(values).reduce((total, value) => {
    return total + (Number.isFinite(value) && value >= 0 ? value : 0);
  }, 0);
}
