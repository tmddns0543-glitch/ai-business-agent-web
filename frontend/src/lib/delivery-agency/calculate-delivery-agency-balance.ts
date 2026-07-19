import { calculateDeliveryAgencySummary } from "@/lib/delivery-agency/calculate-delivery-agency-summary";
import type { BusinessDate } from "@/types/business-day";
import type { DeliveryAgencyTransaction } from "@/types/delivery-agency";

export function calculateDeliveryAgencyBalanceThroughDate(
  transactions: readonly DeliveryAgencyTransaction[],
  agencyId: string,
  businessDate: BusinessDate,
  initialCashBalance: number,
): number {
  const includedTransactions = transactions.filter(
    (transaction) =>
      transaction.agencyId === agencyId &&
      transaction.businessDate <= businessDate,
  );

  return calculateDeliveryAgencySummary(
    includedTransactions,
    initialCashBalance,
  ).closingCashBalance;
}
