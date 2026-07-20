"use server";

import { requireAuthenticatedUser, requireCurrentBusiness } from "@/lib/auth/current-context";
import type { SalesRow, SalesServerResult } from "@/lib/sales/sales-server-result";
import { createClient } from "@/lib/supabase/server";
import { platformSnapshotToSales, validateCreateSaleInput } from "@/repositories/sales/sales-mapper";
import type { CreateSaleInput, UpdateSaleInput } from "@/repositories/sales/sales-types";
import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type { SettlementPlatformId } from "@/types/settlement";

export type SalesImportContext = {
  businessName: string;
  role: "owner" | "manager" | "staff";
  databaseJuneRecordCount: number;
  storageMode: string;
  diagnostic: { userId: string; businessId: string } | null;
};

function failure(message: string, code: "INVALID_DATA" | "NOT_FOUND" | "PERMISSION" | "CONFLICT" | "DATABASE" = "DATABASE") {
  return { ok: false, code, message } as const;
}

function mapDatabaseError(error: { code?: string }): SalesServerResult<never> {
  if (error.code === "42501") return failure("매출 데이터에 접근할 권한이 없습니다.", "PERMISSION");
  if (error.code === "23505") return failure("같은 날짜와 채널의 매출이 이미 존재합니다.", "CONFLICT");
  return failure("매출 데이터 처리 중 오류가 발생했습니다.");
}

async function context() {
  const [user, business, supabase] = await Promise.all([
    requireAuthenticatedUser(),
    requireCurrentBusiness(),
    createClient(),
  ]);
  return { user, business, supabase };
}

export async function getSalesImportContextAction(): Promise<SalesServerResult<SalesImportContext>> {
  try {
    const { user, business, supabase } = await context();
    const { count, error } = await supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("business_date", "2026-06-01")
      .lte("business_date", "2026-06-30");
    if (error) return mapDatabaseError(error);
    return {
      ok: true,
      data: {
        businessName: business.name,
        role: business.role,
        databaseJuneRecordCount: count ?? 0,
        storageMode: process.env.NEXT_PUBLIC_SALES_STORAGE_MODE ?? "local",
        diagnostic: process.env.NODE_ENV === "development" ? { userId: user.id, businessId: business.id } : null,
      },
    };
  } catch {
    return failure("로그인과 현재 사업장을 확인하지 못했습니다.", "PERMISSION");
  }
}

export async function getAllSalesAction(): Promise<SalesServerResult<SalesRow[]>> {
  try {
    const { business, supabase } = await context();
    const { data, error } = await supabase.from("sales").select("*").eq("business_id", business.id).order("business_date").order("platform").order("channel");
    return error ? mapDatabaseError(error) : { ok: true, data };
  } catch { return failure("현재 사업장의 매출을 불러오지 못했습니다."); }
}

export async function getSalesByIdAction(id: string): Promise<SalesServerResult<SalesRow | null>> {
  try {
    const { business, supabase } = await context();
    const { data, error } = await supabase.from("sales").select("*").eq("business_id", business.id).eq("id", id).maybeSingle();
    return error ? mapDatabaseError(error) : { ok: true, data };
  } catch { return failure("매출을 불러오지 못했습니다."); }
}

export async function getSalesByDateRangeAction(startDate: BusinessDate, endDate: BusinessDate): Promise<SalesServerResult<SalesRow[]>> {
  if (!isValidBusinessDate(startDate) || !isValidBusinessDate(endDate) || startDate > endDate) return failure("조회 기간이 올바르지 않습니다.", "INVALID_DATA");
  try {
    const { business, supabase } = await context();
    const { data, error } = await supabase.from("sales").select("*").eq("business_id", business.id).gte("business_date", startDate).lte("business_date", endDate).order("business_date").order("platform").order("channel");
    return error ? mapDatabaseError(error) : { ok: true, data };
  } catch { return failure("매출 조회 중 연결 오류가 발생했습니다."); }
}

export async function createSaleAction(input: CreateSaleInput): Promise<SalesServerResult<SalesRow>> {
  try {
    validateCreateSaleInput(input);
    const { user, business, supabase } = await context();
    const { data, error } = await supabase.from("sales").insert({
      business_id: business.id, business_date: input.businessDate, platform: input.platform, channel: input.channel,
      payment_method: input.paymentMethod, amount: input.amount, order_count: input.orderCount, memo: input.memo,
      source: input.source, source_record_id: input.sourceRecordId, import_key: input.importKey, created_by: user.id,
    }).select("*").single();
    return error ? mapDatabaseError(error) : { ok: true, data };
  } catch { return failure("매출을 저장하지 못했습니다.", "INVALID_DATA"); }
}

export async function updateSaleAction(id: string, input: UpdateSaleInput): Promise<SalesServerResult<SalesRow>> {
  try {
    const { business, supabase } = await context();
    const { data, error } = await supabase.from("sales").update({
      business_date: input.businessDate, platform: input.platform, channel: input.channel,
      payment_method: input.paymentMethod, amount: input.amount, order_count: input.orderCount, memo: input.memo,
    }).eq("business_id", business.id).eq("id", id).select("*").maybeSingle();
    if (error) return mapDatabaseError(error);
    return data ? { ok: true, data } : failure("수정할 매출을 찾지 못했습니다.", "NOT_FOUND");
  } catch { return failure("매출을 수정하지 못했습니다."); }
}

export async function removeSaleAction(id: string): Promise<SalesServerResult<null>> {
  try {
    const { business, supabase } = await context();
    const { error } = await supabase.from("sales").delete().eq("business_id", business.id).eq("id", id);
    return error ? mapDatabaseError(error) : { ok: true, data: null };
  } catch { return failure("매출을 삭제하지 못했습니다."); }
}

export async function savePlatformSalesAction(date: BusinessDate, platform: SettlementPlatformId, snapshot: Readonly<Record<string, unknown>>, source: "app" | "local-import" = "app"): Promise<SalesServerResult<SalesRow[]>> {
  try {
    const inputs = platformSnapshotToSales(date, platform, snapshot, source);
    const { user, business, supabase } = await context();
    const rows = inputs.map((input) => ({
      business_id: business.id, business_date: input.businessDate, platform: input.platform, channel: input.channel,
      payment_method: input.paymentMethod, amount: input.amount, order_count: input.orderCount, memo: input.memo,
      source: input.source, source_record_id: input.sourceRecordId, import_key: input.importKey, created_by: user.id,
    }));
    const { data, error } = await supabase.from("sales").upsert(rows, { onConflict: "business_id,business_date,platform,channel" }).select("*");
    return error ? mapDatabaseError(error) : { ok: true, data };
  } catch { return failure("플랫폼 매출을 저장하지 못했습니다.", "INVALID_DATA"); }
}

export async function removeSalesByDateAction(date: BusinessDate): Promise<SalesServerResult<null>> {
  if (!isValidBusinessDate(date)) return failure("영업일이 올바르지 않습니다.", "INVALID_DATA");
  try {
    const { business, supabase } = await context();
    const { error } = await supabase.from("sales").delete().eq("business_id", business.id).eq("business_date", date);
    return error ? mapDatabaseError(error) : { ok: true, data: null };
  } catch { return failure("해당 영업일의 매출을 삭제하지 못했습니다."); }
}
