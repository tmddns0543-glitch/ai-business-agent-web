import {
  calculateSalesSettlement,
  type SalesSettlementSummary,
} from "@/lib/settlement/calculate-sales-settlement";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { resolveBusinessFeeSettingsForBusinessDate } from "@/lib/storage/fee-settings-storage";
import { getSalesByBusinessDate } from "@/lib/storage/sales-by-business-day-storage";
import type { BusinessDate } from "@/types/business-day";

export function getSalesSettlementByBusinessDate(
  businessDate: BusinessDate,
): SalesSettlementSummary {
  const salesByPlatform = getSalesByBusinessDate(businessDate);
  const settings = resolveBusinessFeeSettingsForBusinessDate(businessDate);

  return calculateSalesSettlement(salesByPlatform, settings);
}

export function getSalesSettlementFromStorage(): SalesSettlementSummary {
  return getSalesSettlementByBusinessDate(getSelectedBusinessDate());
}
