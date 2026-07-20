import { BUSINESS_DAY_SALES_STORAGE_KEY, getBusinessDaySalesStorage, getPlatformSalesByBusinessDate, removeSalesByBusinessDate, replaceSalesByBusinessDate, savePlatformSalesByBusinessDate } from "@/lib/storage/sales-by-business-day-storage";
import { createLocalSale, isStoredSalesObject, platformSnapshotToSales, salesToStoredSales } from "@/repositories/sales/sales-mapper";
import type { SalesRepository } from "@/repositories/sales/sales-repository";
import { SalesRepositoryError, type CreateSaleInput, type Sale, type UpdateSaleInput } from "@/repositories/sales/sales-types";
import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type { SettlementPlatformId } from "@/types/settlement";

export type LocalSalesCandidateError = { recordId: string; message: string };

function assertReadableStorage() {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(BUSINESS_DAY_SALES_STORAGE_KEY);
  if (raw === null) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value) || !("version" in value) || value.version !== 1 || !("days" in value) || typeof value.days !== "object" || value.days === null || Array.isArray(value.days)) {
      throw new Error("invalid shape");
    }
    for (const [date, sales] of Object.entries(value.days)) {
      if (!isValidBusinessDate(date) || !isStoredSalesObject(sales)) throw new Error("invalid day");
      for (const [platform, snapshot] of Object.entries(sales)) platformSnapshotToSales(date, platform as SettlementPlatformId, snapshot as Record<string, unknown>);
    }
  } catch {
    throw new SalesRepositoryError("STORAGE", "이 기기의 매출 데이터가 손상되었습니다. 백업 파일을 확인해 주세요.");
  }
}

function allLocalSales(): Sale[] {
  assertReadableStorage();
  const storage = getBusinessDaySalesStorage();
  return Object.entries(storage.days).flatMap(([date, stored]) => {
    if (!isValidBusinessDate(date) || !isStoredSalesObject(stored)) throw new SalesRepositoryError("INVALID_DATA", `영업일 ${date} 매출 데이터가 올바르지 않습니다.`);
    return Object.entries(stored).flatMap(([platform, snapshot]) =>
      platformSnapshotToSales(date, platform as SettlementPlatformId, snapshot as Record<string, unknown>).map(createLocalSale),
    );
  });
}

export type LocalSalesImportRange = { startDate: BusinessDate; endDate: BusinessDate };

export function readLocalSalesImportCandidates(range?: LocalSalesImportRange): { sales: Sale[]; errors: LocalSalesCandidateError[] } {
  if (typeof window === "undefined") return { sales: [], errors: [] };
  const raw = window.localStorage.getItem(BUSINESS_DAY_SALES_STORAGE_KEY);
  if (raw === null) return { sales: [], errors: [] };
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch { throw new SalesRepositoryError("STORAGE", "이 기기의 매출 JSON을 읽을 수 없습니다."); }
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("version" in value) || value.version !== 1 || !("days" in value) || typeof value.days !== "object" || value.days === null || Array.isArray(value.days)) {
    throw new SalesRepositoryError("STORAGE", "이 기기의 매출 저장 구조가 올바르지 않습니다.");
  }
  const sales: Sale[] = [];
  const errors: LocalSalesCandidateError[] = [];
  for (const [date, stored] of Object.entries(value.days)) {
    if (!isValidBusinessDate(date)) {
      continue;
    }
    if (range && (date < range.startDate || date > range.endDate)) continue;
    if (!isStoredSalesObject(stored)) {
      errors.push({ recordId: date, message: "날짜 또는 플랫폼 구조가 올바르지 않습니다." });
      continue;
    }
    for (const [platform, snapshot] of Object.entries(stored)) {
      const recordId = `${date}:${platform}`;
      try {
        sales.push(...platformSnapshotToSales(date, platform as SettlementPlatformId, snapshot as Record<string, unknown>, "local-import").map(createLocalSale));
      } catch (error) {
        errors.push({ recordId, message: error instanceof Error ? error.message : "매출 값이 올바르지 않습니다." });
      }
    }
  }
  return { sales, errors };
}

export class LocalStorageSalesRepository implements SalesRepository {
  async create(input: CreateSaleInput) {
    const current = await this.getByDate(input.businessDate);
    if (current.some((sale) => sale.platform === input.platform && sale.channel === input.channel)) throw new SalesRepositoryError("CONFLICT", "같은 날짜와 채널의 매출이 이미 존재합니다.");
    await this.replaceByDate(input.businessDate, salesToStoredSales([...current, createLocalSale(input)]));
    return createLocalSale(input);
  }

  async update(id: string, input: UpdateSaleInput) {
    const existing = await this.getById(id);
    if (!existing) throw new SalesRepositoryError("NOT_FOUND", "수정할 매출을 찾지 못했습니다.");
    const next = { ...existing, ...input, updatedAt: new Date().toISOString() };
    const oldDateRows = (await this.getByDate(existing.businessDate)).filter((sale) => sale.id !== id);
    await this.replaceByDate(existing.businessDate, salesToStoredSales(oldDateRows));
    const targetRows = next.businessDate === existing.businessDate ? oldDateRows : await this.getByDate(next.businessDate);
    await this.replaceByDate(next.businessDate, salesToStoredSales([...targetRows, next]));
    return next;
  }

  async remove(id: string) {
    const existing = await this.getById(id);
    if (!existing) return;
    const remaining = (await this.getByDate(existing.businessDate)).filter((sale) => sale.id !== id);
    await this.replaceByDate(existing.businessDate, salesToStoredSales(remaining));
  }

  async getById(id: string) { return allLocalSales().find((sale) => sale.id === id) ?? null; }
  async getByDate(date: BusinessDate) { return allLocalSales().filter((sale) => sale.businessDate === date); }
  async getByMonth(month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new SalesRepositoryError("INVALID_DATA", "조회 월이 올바르지 않습니다.");
    return allLocalSales().filter((sale) => sale.businessDate.startsWith(`${month}-`));
  }
  async getByDateRange(startDate: BusinessDate, endDate: BusinessDate) { return allLocalSales().filter((sale) => sale.businessDate >= startDate && sale.businessDate <= endDate); }
  async getAllForBusiness() { return allLocalSales(); }
  async getStoredSalesByDate(date: BusinessDate) { return salesToStoredSales(await this.getByDate(date)); }
  async getPlatformSnapshot(date: BusinessDate, platform: SettlementPlatformId) { assertReadableStorage(); return getPlatformSalesByBusinessDate(date, platform); }
  async savePlatformSnapshot(date: BusinessDate, platform: SettlementPlatformId, values: Readonly<Record<string, unknown>>) {
    assertReadableStorage();
    platformSnapshotToSales(date, platform, values);
    if (!savePlatformSalesByBusinessDate(date, platform, values)) throw new SalesRepositoryError("STORAGE", "매출을 이 기기에 저장하지 못했습니다.");
  }
  async removeByDate(date: BusinessDate) { assertReadableStorage(); if (!removeSalesByBusinessDate(date)) throw new SalesRepositoryError("STORAGE", "매출을 삭제하지 못했습니다."); }
  async replaceByDate(date: BusinessDate, sales: import("@/lib/settlement/map-sales-to-settlement-items").StoredSalesByPlatform) { assertReadableStorage(); if (!replaceSalesByBusinessDate(date, sales)) throw new SalesRepositoryError("STORAGE", "매출을 복원하지 못했습니다."); }
}
