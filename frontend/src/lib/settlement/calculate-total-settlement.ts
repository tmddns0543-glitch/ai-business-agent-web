import type { SettlementResult } from "@/types/settlement";

export function sumSettlementResults(
  results: readonly SettlementResult[],
): SettlementResult {
  return results.reduce<SettlementResult>(
    (total, result) => ({
      grossSales: total.grossSales + result.grossSales,
      brokerageFee: total.brokerageFee + result.brokerageFee,
      paymentFee: total.paymentFee + result.paymentFee,
      cardFee: total.cardFee + result.cardFee,
      deliveryFee: total.deliveryFee + result.deliveryFee,
      vat: total.vat + result.vat,
      expectedDeduction:
        total.expectedDeduction + result.expectedDeduction,
      expectedSettlement:
        total.expectedSettlement + result.expectedSettlement,
    }),
    {
      grossSales: 0,
      brokerageFee: 0,
      paymentFee: 0,
      cardFee: 0,
      deliveryFee: 0,
      vat: 0,
      expectedDeduction: 0,
      expectedSettlement: 0,
    },
  );
}

export function calculateTotalSettlement(
  results: readonly SettlementResult[],
): SettlementResult {
  return sumSettlementResults(results);
}
