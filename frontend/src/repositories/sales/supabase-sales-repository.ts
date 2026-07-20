import { createSaleAction, getAllSalesAction, getSalesByDateRangeAction, getSalesByIdAction, removeSaleAction, removeSalesByDateAction, savePlatformSalesAction, updateSaleAction } from "@/app/actions/sales";
import { dbRowToSale, salesToStoredSales } from "@/repositories/sales/sales-mapper";
import type { SalesRepository } from "@/repositories/sales/sales-repository";
import { SalesRepositoryError, type CreateSaleInput, type UpdateSaleInput } from "@/repositories/sales/sales-types";
import type { SalesServerResult } from "@/lib/sales/sales-server-result";
import type { BusinessDate } from "@/types/business-day";
import type { SettlementPlatformId } from "@/types/settlement";

function unwrap<T>(result: SalesServerResult<T>): T {
  if (result.ok) return result.data;
  const code = result.code === "PERMISSION" ? "PERMISSION" : result.code === "CONFLICT" ? "CONFLICT" : result.code === "NOT_FOUND" ? "NOT_FOUND" : result.code === "INVALID_DATA" ? "INVALID_DATA" : "NETWORK";
  throw new SalesRepositoryError(code, result.message);
}

export class SupabaseSalesRepository implements SalesRepository {
  async create(input: CreateSaleInput) { return dbRowToSale(unwrap(await createSaleAction(input))); }
  async update(id: string, input: UpdateSaleInput) { return dbRowToSale(unwrap(await updateSaleAction(id, input))); }
  async remove(id: string) { unwrap(await removeSaleAction(id)); }
  async getById(id: string) { const row = unwrap(await getSalesByIdAction(id)); return row ? dbRowToSale(row) : null; }
  async getByDate(date: BusinessDate) { return this.getByDateRange(date, date); }
  async getByMonth(month: string) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) throw new SalesRepositoryError("INVALID_DATA", "조회 월이 올바르지 않습니다.");
    const year = Number(match[1]);
    const monthNumber = Number(match[2]);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return this.getByDateRange(`${month}-01`, `${month}-${String(lastDay).padStart(2, "0")}`);
  }
  async getByDateRange(startDate: BusinessDate, endDate: BusinessDate) { return unwrap(await getSalesByDateRangeAction(startDate, endDate)).map(dbRowToSale); }
  async getAllForBusiness() { return unwrap(await getAllSalesAction()).map(dbRowToSale); }
  async getStoredSalesByDate(date: BusinessDate) { return salesToStoredSales(await this.getByDate(date)); }
  async getPlatformSnapshot(date: BusinessDate, platform: SettlementPlatformId) { return (await this.getStoredSalesByDate(date))[platform] as Record<string, unknown> ?? {}; }
  async savePlatformSnapshot(date: BusinessDate, platform: SettlementPlatformId, values: Readonly<Record<string, unknown>>) { unwrap(await savePlatformSalesAction(date, platform, values)); }
  async removeByDate(date: BusinessDate) { unwrap(await removeSalesByDateAction(date)); }
  async replaceByDate(date: BusinessDate, sales: import("@/lib/settlement/map-sales-to-settlement-items").StoredSalesByPlatform) {
    unwrap(await removeSalesByDateAction(date));
    for (const [platform, snapshot] of Object.entries(sales)) {
      unwrap(await savePlatformSalesAction(date, platform as SettlementPlatformId, snapshot as Record<string, unknown>));
    }
  }
}
