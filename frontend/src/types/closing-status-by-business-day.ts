import type { BusinessDate } from "@/types/business-day";

export type ConfirmableSectionStatus = "unconfirmed" | "confirmed";

export type ExpenseClosingStatus =
  | "unconfirmed"
  | "confirmed-with-data"
  | "confirmed-none";

export type FinalClosingStatus = "open" | "completed";

export interface BusinessDayClosingStatus {
  salesStatus: ConfirmableSectionStatus;
  expenseStatus: ExpenseClosingStatus;
  deliveryStatus: ConfirmableSectionStatus;
  closingStatus: FinalClosingStatus;
  completedAt: string | null;
  updatedAt: string;
}

export interface BusinessDayClosingStatusStorageData {
  version: 1;
  days: Partial<Record<BusinessDate, BusinessDayClosingStatus>>;
}

export type ClosingSection = "sales" | "delivery";
