import type {
  SettlementCalculationInput,
  SettlementResult,
  VatTarget,
} from "@/types/settlement";

function normalizeNonNegativeNumber(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function calculatePercentageFee(amount: number, rate: number) {
  return Math.round(amount * (normalizeNonNegativeNumber(rate) / 100));
}

export function calculateItemSettlement(
  input: SettlementCalculationInput,
): SettlementResult {
  const grossSales = normalizeNonNegativeNumber(input.salesAmount);

  if (!input.setting.enabled) {
    return {
      grossSales,
      brokerageFee: 0,
      paymentFee: 0,
      cardFee: 0,
      deliveryFee: 0,
      vat: 0,
      expectedDeduction: 0,
      expectedSettlement: grossSales,
    };
  }

  const brokerageFee = calculatePercentageFee(
    grossSales,
    input.setting.brokerageRate,
  );

  const paymentFee =
    input.setting.transactionFeeType === "payment"
      ? calculatePercentageFee(grossSales, input.setting.paymentRate)
      : 0;

  const cardFee =
    input.setting.transactionFeeType === "card"
      ? calculatePercentageFee(grossSales, input.setting.cardRate)
      : 0;

  const orderCount = Math.floor(
    normalizeNonNegativeNumber(input.orderCount),
  );

  const deliveryFeePerOrder = normalizeNonNegativeNumber(
    input.setting.deliveryFeePerOrder,
  );

  const deliveryFee = input.setting.usesOrderCount
    ? Math.round(orderCount * deliveryFeePerOrder)
    : 0;

  const feeMap: Record<VatTarget, number> = {
    brokerageFee,
    paymentFee,
    cardFee,
    deliveryFee,
  };

  const uniqueVatTargets = new Set(input.setting.vatTargets);
  const vatBase = Array.from(uniqueVatTargets).reduce(
    (total, target) => total + feeMap[target],
    0,
  );

  const vat = calculatePercentageFee(vatBase, input.setting.vatRate);

  const expectedDeduction =
    brokerageFee + paymentFee + cardFee + deliveryFee + vat;

  return {
    grossSales,
    brokerageFee,
    paymentFee,
    cardFee,
    deliveryFee,
    vat,
    expectedDeduction,
    expectedSettlement: grossSales - expectedDeduction,
  };
}
