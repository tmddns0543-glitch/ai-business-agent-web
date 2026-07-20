import type { StoredSalesByPlatform } from "@/lib/settlement/map-sales-to-settlement-items";
import type { CreateSaleInput, Sale, UpdateSaleInput } from "@/repositories/sales/sales-types";
import type { BusinessDate } from "@/types/business-day";
import type { SettlementPlatformId } from "@/types/settlement";

export interface SalesRepository {
  create(input: CreateSaleInput): Promise<Sale>;
  update(id: string, input: UpdateSaleInput): Promise<Sale>;
  remove(id: string): Promise<void>;
  getById(id: string): Promise<Sale | null>;
  getByDate(date: BusinessDate): Promise<Sale[]>;
  getByMonth(month: string): Promise<Sale[]>;
  getByDateRange(startDate: BusinessDate, endDate: BusinessDate): Promise<Sale[]>;
  getAllForBusiness(): Promise<Sale[]>;
  getStoredSalesByDate(date: BusinessDate): Promise<StoredSalesByPlatform>;
  getPlatformSnapshot(date: BusinessDate, platform: SettlementPlatformId): Promise<Record<string, unknown>>;
  savePlatformSnapshot(date: BusinessDate, platform: SettlementPlatformId, values: Readonly<Record<string, unknown>>): Promise<void>;
  removeByDate(date: BusinessDate): Promise<void>;
  replaceByDate(date: BusinessDate, sales: StoredSalesByPlatform): Promise<void>;
}
