export type SalesFieldType = "money" | "count";

export type SalesFieldConfig = {
  key: string;
  label: string;
  description?: string;
  type: SalesFieldType;
};

export type SalesFormValues = Record<string, number>;

export type SalesPlatformConfig = {
  platformKey: SettlementPlatformId;
  title: string;
  description: string;
  fields: SalesFieldConfig[];
};
import type { SettlementPlatformId } from "@/types/settlement";
