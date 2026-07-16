import type {
  DeliveryAgency,
  DeliveryAgencySummary,
  DeliveryAgencySummaryByAgency,
  DeliveryAgencyTransaction,
} from "@/types/delivery-agency";

function normalizeTransactionAmount(amount: number): number {
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function normalizeOpeningCashBalance(balance: number): number {
  return Number.isFinite(balance) ? balance : 0;
}

function createEmptySummary(
  openingCashBalance: number,
): DeliveryAgencySummary {
  return {
    transactionCount: 0,
    cashChargeTotal: 0,
    chargeFeeTotal: 0,
    deliveryFeeTotal: 0,
    cashCreditTotal: 0,
    monthlyFeeTotal: 0,
    operatingExpenseTotal: 0,
    externalCashOutflowTotal: 0,
    estimatedInputVatTotal: 0,
    openingCashBalance,
    cashBalanceChange: 0,
    closingCashBalance: openingCashBalance,
  };
}

export function calculateDeliveryAgencySummary(
  transactions: readonly DeliveryAgencyTransaction[],
  openingCashBalance: number,
): DeliveryAgencySummary {
  const normalizedOpeningBalance =
    normalizeOpeningCashBalance(openingCashBalance);
  const summary = createEmptySummary(normalizedOpeningBalance);

  transactions.forEach((transaction) => {
    const amount = normalizeTransactionAmount(transaction.amount);

    summary.transactionCount += 1;

    switch (transaction.type) {
      case "cash-charge":
        summary.cashChargeTotal += amount;
        summary.externalCashOutflowTotal += amount;
        summary.cashBalanceChange += amount;
        break;
      case "charge-fee":
        summary.chargeFeeTotal += amount;
        summary.operatingExpenseTotal += amount;
        summary.externalCashOutflowTotal += amount;
        break;
      case "delivery-fee":
        summary.deliveryFeeTotal += amount;
        summary.operatingExpenseTotal += amount;
        summary.cashBalanceChange -= amount;
        summary.estimatedInputVatTotal += Math.round(amount / 11);
        break;
      case "cash-credit":
        summary.cashCreditTotal += amount;
        summary.cashBalanceChange += amount;
        break;
      case "monthly-fee":
        summary.monthlyFeeTotal += amount;
        summary.operatingExpenseTotal += amount;
        summary.cashBalanceChange -= amount;
        summary.estimatedInputVatTotal += Math.round(amount / 11);
        break;
    }
  });

  summary.closingCashBalance =
    summary.openingCashBalance + summary.cashBalanceChange;

  return summary;
}

export function calculateDeliveryAgencySummariesByAgency(
  transactions: readonly DeliveryAgencyTransaction[],
  agencies: readonly DeliveryAgency[],
): DeliveryAgencySummaryByAgency[] {
  return agencies.map((agency) => ({
    agencyId: agency.id,
    agencyName: agency.name,
    summary: calculateDeliveryAgencySummary(
      transactions.filter(
        (transaction) => transaction.agencyId === agency.id,
      ),
      agency.initialCashBalance,
    ),
  }));
}

export function calculateTotalDeliveryAgencySummary(
  summaries: readonly DeliveryAgencySummary[],
): DeliveryAgencySummary {
  return summaries.reduce<DeliveryAgencySummary>(
    (total, summary) => ({
      transactionCount: total.transactionCount + summary.transactionCount,
      cashChargeTotal: total.cashChargeTotal + summary.cashChargeTotal,
      chargeFeeTotal: total.chargeFeeTotal + summary.chargeFeeTotal,
      deliveryFeeTotal: total.deliveryFeeTotal + summary.deliveryFeeTotal,
      cashCreditTotal: total.cashCreditTotal + summary.cashCreditTotal,
      monthlyFeeTotal: total.monthlyFeeTotal + summary.monthlyFeeTotal,
      operatingExpenseTotal:
        total.operatingExpenseTotal + summary.operatingExpenseTotal,
      externalCashOutflowTotal:
        total.externalCashOutflowTotal +
        summary.externalCashOutflowTotal,
      estimatedInputVatTotal:
        total.estimatedInputVatTotal + summary.estimatedInputVatTotal,
      openingCashBalance:
        total.openingCashBalance + summary.openingCashBalance,
      cashBalanceChange:
        total.cashBalanceChange + summary.cashBalanceChange,
      closingCashBalance:
        total.closingCashBalance + summary.closingCashBalance,
    }),
    createEmptySummary(0),
  );
}
