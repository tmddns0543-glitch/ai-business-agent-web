import type { StoredSalesByPlatform } from "@/lib/settlement/map-sales-to-settlement-items";
import type { BusinessDate } from "@/types/business-day";

export interface BusinessDaySalesStorageData {
  version: 1;
  days: Partial<Record<BusinessDate, StoredSalesByPlatform>>;
}
