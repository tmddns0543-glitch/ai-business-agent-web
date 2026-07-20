import type { StoredSalesByPlatform } from "@/lib/settlement/map-sales-to-settlement-items";
import type { CreateSaleInput, Sale, SalePaymentMethod, SaleSource } from "@/repositories/sales/sales-types";
import { SalesRepositoryError } from "@/repositories/sales/sales-types";
import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import { SETTLEMENT_CHANNEL_IDS, type SettlementChannelId, type SettlementPlatformId } from "@/types/settlement";
import type { Database } from "@/types/database";

type ChannelMapping = {
  platform: SettlementPlatformId;
  amountKey: string;
  orderCountKey?: string;
  paymentMethod: SalePaymentMethod;
};

export const SALES_CHANNEL_MAPPINGS: Readonly<Record<SettlementChannelId, ChannelMapping>> = {
  [SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_PREPAID]: { platform: "baemin", amountKey: "prepaid", paymentMethod: "prepaid" },
  [SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_CARD]: { platform: "baemin", amountKey: "card", paymentMethod: "card" },
  [SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_CASH]: { platform: "baemin", amountKey: "cash", paymentMethod: "cash" },
  [SETTLEMENT_CHANNEL_IDS.BAEMIN_ONE]: { platform: "baemin", amountKey: "baeminOne", orderCountKey: "baeminOneOrders", paymentMethod: null },
  [SETTLEMENT_CHANNEL_IDS.COUPANG_EATS_DELIVERY]: { platform: "coupang-eats", amountKey: "sales", orderCountKey: "orders", paymentMethod: null },
  [SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_PREPAID]: { platform: "yogiyo", amountKey: "prepaid", paymentMethod: "prepaid" },
  [SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_CARD]: { platform: "yogiyo", amountKey: "card", paymentMethod: "card" },
  [SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_CASH]: { platform: "yogiyo", amountKey: "cash", paymentMethod: "cash" },
  [SETTLEMENT_CHANNEL_IDS.YOGIYO_DELIVERY]: { platform: "yogiyo", amountKey: "yogiDelivery", orderCountKey: "yogiDeliveryOrders", paymentMethod: null },
  [SETTLEMENT_CHANNEL_IDS.DDANGYO_SHOP_DELIVERY_PREPAID]: { platform: "ddangyo", amountKey: "prepaid", paymentMethod: "prepaid" },
  [SETTLEMENT_CHANNEL_IDS.GENERAL_CARD]: { platform: "general", amountKey: "card", paymentMethod: "card" },
  [SETTLEMENT_CHANNEL_IDS.GENERAL_CASH]: { platform: "general", amountKey: "cash", paymentMethod: "cash" },
  [SETTLEMENT_CHANNEL_IDS.GENERAL_BANK_TRANSFER]: { platform: "general", amountKey: "bankTransfer", paymentMethod: "bank-transfer" },
};

const CHANNEL_IDS = Object.keys(SALES_CHANNEL_MAPPINGS) as SettlementChannelId[];

function readNonNegativeInteger(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new SalesRepositoryError("INVALID_DATA", `${field} 값이 올바르지 않습니다.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function platformSnapshotToSales(
  businessDate: BusinessDate,
  platform: SettlementPlatformId,
  snapshot: Readonly<Record<string, unknown>>,
  source: SaleSource = "app",
): CreateSaleInput[] {
  if (!isValidBusinessDate(businessDate)) throw new SalesRepositoryError("INVALID_DATA", "영업일이 올바르지 않습니다.");
  return CHANNEL_IDS.filter((channel) => SALES_CHANNEL_MAPPINGS[channel].platform === platform).map((channel) => {
    const mapping = SALES_CHANNEL_MAPPINGS[channel];
    const amount = readNonNegativeInteger(snapshot[mapping.amountKey] ?? 0, mapping.amountKey);
    const orderCount = mapping.orderCountKey ? readNonNegativeInteger(snapshot[mapping.orderCountKey] ?? 0, mapping.orderCountKey) : null;
    const sourceRecordId = `${businessDate}:${platform}:${channel}`;
    return {
      businessDate,
      platform,
      channel,
      paymentMethod: mapping.paymentMethod,
      amount,
      orderCount,
      memo: null,
      source,
      sourceRecordId: source === "local-import" ? sourceRecordId : null,
      importKey: source === "local-import" ? `local-sales:v1:${sourceRecordId}` : null,
    };
  });
}

export function validateCreateSaleInput(input: CreateSaleInput) {
  if (!isValidBusinessDate(input.businessDate)) throw new SalesRepositoryError("INVALID_DATA", "영업일이 올바르지 않습니다.");
  const mapping = SALES_CHANNEL_MAPPINGS[input.channel];
  if (!mapping || mapping.platform !== input.platform || mapping.paymentMethod !== input.paymentMethod) throw new SalesRepositoryError("INVALID_DATA", "플랫폼과 매출 채널이 일치하지 않습니다.");
  readNonNegativeInteger(input.amount, "매출 금액");
  if (input.orderCount !== null) readNonNegativeInteger(input.orderCount, "주문 수");
  if (Boolean(mapping.orderCountKey) !== (input.orderCount !== null)) throw new SalesRepositoryError("INVALID_DATA", "주문 수 필드가 채널 구조와 일치하지 않습니다.");
}

export function salesToStoredSales(sales: readonly Sale[]): StoredSalesByPlatform {
  const result: Record<string, Record<string, unknown>> = {};
  for (const sale of sales) {
    const mapping = SALES_CHANNEL_MAPPINGS[sale.channel];
    if (!mapping || mapping.platform !== sale.platform) throw new SalesRepositoryError("INVALID_DATA", `매출 채널 ${sale.channel} 데이터가 올바르지 않습니다.`);
    const snapshot = result[sale.platform] ?? {};
    snapshot[mapping.amountKey] = sale.amount;
    if (mapping.orderCountKey) snapshot[mapping.orderCountKey] = sale.orderCount ?? 0;
    result[sale.platform] = snapshot;
  }
  return result as StoredSalesByPlatform;
}

function isPlatform(value: string): value is SettlementPlatformId {
  return ["baemin", "coupang-eats", "yogiyo", "ddangyo", "general"].includes(value);
}

function isChannel(value: string): value is SettlementChannelId {
  return Object.hasOwn(SALES_CHANNEL_MAPPINGS, value);
}

function isPaymentMethod(value: string | null): value is SalePaymentMethod {
  return value === null || ["prepaid", "card", "cash", "bank-transfer"].includes(value);
}

export function dbRowToSale(row: Database["public"]["Tables"]["sales"]["Row"]): Sale {
  if (!isValidBusinessDate(row.business_date) || !isPlatform(row.platform) || !isChannel(row.channel) || !isPaymentMethod(row.payment_method)) {
    throw new SalesRepositoryError("INVALID_DATA", `매출 레코드 ${row.id}의 분류값이 올바르지 않습니다.`);
  }
  return {
    id: row.id,
    businessDate: row.business_date,
    platform: row.platform,
    channel: row.channel,
    paymentMethod: row.payment_method,
    amount: readNonNegativeInteger(row.amount, `매출 ${row.id} 금액`),
    orderCount: row.order_count === null ? null : readNonNegativeInteger(row.order_count, `매출 ${row.id} 주문 수`),
    memo: row.memo,
    source: row.source === "local-import" ? "local-import" : "app",
    sourceRecordId: row.source_record_id,
    importKey: row.import_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createLocalSale(input: CreateSaleInput): Sale {
  const timestamp = new Date().toISOString();
  return { ...input, id: `local:${input.businessDate}:${input.platform}:${input.channel}`, createdAt: timestamp, updatedAt: timestamp };
}

export function isStoredSalesObject(value: unknown): value is StoredSalesByPlatform {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([platform, snapshot]) => isPlatform(platform) && isRecord(snapshot));
}
