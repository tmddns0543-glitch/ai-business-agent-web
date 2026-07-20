import {
  calculateSalesSettlement,
  type SalesSettlementSummary,
} from "@/lib/settlement/calculate-sales-settlement";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { resolveBusinessFeeSettingsForBusinessDate } from "@/lib/storage/fee-settings-storage";
import { getSalesRepository } from "@/repositories/sales/get-sales-repository";
import type { BusinessDate } from "@/types/business-day";

export async function getSalesSettlementByBusinessDate(
  businessDate: BusinessDate,
): Promise<SalesSettlementSummary> {
  const salesByPlatform = await getSalesRepository().getStoredSalesByDate(businessDate);
  const settings = resolveBusinessFeeSettingsForBusinessDate(businessDate);

  return calculateSalesSettlement(salesByPlatform, settings);
}

export function getSalesSettlementFromStorage(): Promise<SalesSettlementSummary> {
  return getSalesSettlementByBusinessDate(getSelectedBusinessDate());
}
