export type InventoryMonth = string;

export type EndingInventoryStatus = "unconfirmed" | "confirmed";

export interface StoreSettings {
  version: 1;
  inventoryProfitEnabled: boolean;
}

export interface MonthlyInventoryRecord {
  month: InventoryMonth;
  beginningInventory: number | null;
  endingInventory: number | null;
  endingInventoryStatus: EndingInventoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyInventoryStorageData {
  version: 1;
  records: Partial<Record<InventoryMonth, MonthlyInventoryRecord>>;
}

export interface MonthlyMaterialCostResult {
  materialPurchases: number;
  materialCost: number | null;
  inventoryApplied: boolean;
  status: "confirmed" | "estimated" | "waiting";
}
