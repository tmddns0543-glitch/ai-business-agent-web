import type { BusinessDate } from "@/types/business-day";
import type { SettlementChannelId, SettlementPlatformId } from "@/types/settlement";

export type SalePaymentMethod = "prepaid" | "card" | "cash" | "bank-transfer" | null;
export type SaleSource = "app" | "local-import";

export type Sale = {
  id: string;
  businessDate: BusinessDate;
  platform: SettlementPlatformId;
  channel: SettlementChannelId;
  paymentMethod: SalePaymentMethod;
  amount: number;
  orderCount: number | null;
  memo: string | null;
  source: SaleSource;
  sourceRecordId: string | null;
  importKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSaleInput = Omit<Sale, "id" | "createdAt" | "updatedAt">;
export type UpdateSaleInput = Partial<Omit<CreateSaleInput, "source" | "sourceRecordId" | "importKey">>;

export class SalesRepositoryError extends Error {
  constructor(
    public readonly code: "CONFIGURATION" | "INVALID_DATA" | "NOT_FOUND" | "PERMISSION" | "NETWORK" | "CONFLICT" | "STORAGE",
    message: string,
  ) {
    super(message);
    this.name = "SalesRepositoryError";
  }
}
