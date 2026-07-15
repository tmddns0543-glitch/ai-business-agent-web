export type SalesFieldType = "money" | "count";

export type SalesFieldConfig = {
  key: string;
  label: string;
  description?: string;
  type: SalesFieldType;
};

export type SalesFormValues = Record<string, number>;

export type SalesPlatformConfig = {
  platformKey: string;
  title: string;
  description: string;
  storageKey: string;
  fields: SalesFieldConfig[];
};