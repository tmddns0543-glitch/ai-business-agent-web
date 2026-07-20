import { readLocalSalesImportCandidates } from "@/repositories/sales/local-storage-sales-repository";
import { SupabaseSalesRepository } from "@/repositories/sales/supabase-sales-repository";
import { SalesRepositoryError, type CreateSaleInput } from "@/repositories/sales/sales-types";
import type { SalesRepository } from "@/repositories/sales/sales-repository";
import type { Sale } from "@/repositories/sales/sales-types";
import type { BusinessDate } from "@/types/business-day";

export const JUNE_2026_IMPORT_RANGE = {
  startDate: "2026-06-01" as BusinessDate,
  endDate: "2026-06-30" as BusinessDate,
};

export type LocalSalesImportError = { recordId: string; message: string };
export type LocalSalesImportResult = {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: LocalSalesImportError[];
};

export type LocalSalesImportPreview = {
  startDate: BusinessDate;
  endDate: BusinessDate;
  firstDataDate: BusinessDate | null;
  lastDataDate: BusinessDate | null;
  dayCount: number;
  recordCount: number;
  invalidCount: number;
};

export function getLocalSalesImportPreview(): LocalSalesImportPreview {
  const candidates = readLocalSalesImportCandidates(JUNE_2026_IMPORT_RANGE);
  const dates = [...new Set(candidates.sales.map((sale) => sale.businessDate))].sort();
  return {
    ...JUNE_2026_IMPORT_RANGE,
    firstDataDate: dates[0] ?? null,
    lastDataDate: dates.at(-1) ?? null,
    dayCount: dates.length,
    recordCount: candidates.sales.length,
    invalidCount: candidates.errors.length,
  };
}

export async function importSalesCandidates(
  localSales: readonly Sale[],
  candidateErrors: readonly LocalSalesImportError[],
  remote: SalesRepository,
): Promise<LocalSalesImportResult> {
  const remoteSales = await remote.getAllForBusiness();
  const existing = new Set(remoteSales.map((sale) => `${sale.businessDate}:${sale.platform}:${sale.channel}`));
  const result: LocalSalesImportResult = { total: localSales.length + candidateErrors.length, imported: 0, skipped: 0, failed: candidateErrors.length, errors: [...candidateErrors] };

  for (const sale of localSales) {
    const semanticKey = `${sale.businessDate}:${sale.platform}:${sale.channel}`;
    if (existing.has(semanticKey)) { result.skipped += 1; continue; }
    const input: CreateSaleInput = {
      businessDate: sale.businessDate, platform: sale.platform, channel: sale.channel,
      paymentMethod: sale.paymentMethod, amount: sale.amount, orderCount: sale.orderCount, memo: sale.memo,
      source: "local-import", sourceRecordId: semanticKey, importKey: `local-sales:v1:${semanticKey}`,
    };
    try {
      await remote.create(input);
      existing.add(semanticKey);
      result.imported += 1;
    } catch (error) {
      if (error instanceof SalesRepositoryError && error.code === "CONFLICT") result.skipped += 1;
      else { result.failed += 1; result.errors.push({ recordId: sale.id, message: error instanceof Error ? error.message : "가져오지 못했습니다." }); }
    }
  }
  return result;
}

export async function importLocalSalesToSupabase(): Promise<LocalSalesImportResult> {
  const remote = new SupabaseSalesRepository();
  const candidates = readLocalSalesImportCandidates(JUNE_2026_IMPORT_RANGE);
  const localSales = candidates.sales;
  return importSalesCandidates(localSales, candidates.errors, remote);
}
