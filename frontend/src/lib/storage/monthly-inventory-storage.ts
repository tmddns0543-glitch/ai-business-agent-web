import { isValidInventoryMonth } from "@/lib/inventory/inventory-month";
import type {
  InventoryMonth,
  MonthlyInventoryRecord,
  MonthlyInventoryStorageData,
} from "@/types/inventory";

export const MONTHLY_INVENTORY_STORAGE_KEY = "monthly-inventory";

const STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInventoryAmount(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      Number.isFinite(value) &&
      value >= 0)
  );
}

function parseRecord(value: unknown): MonthlyInventoryRecord | null {
  if (
    !isRecord(value) ||
    !isValidInventoryMonth(value.month) ||
    !isInventoryAmount(value.beginningInventory) ||
    !isInventoryAmount(value.endingInventory) ||
    (value.endingInventoryStatus !== "unconfirmed" &&
      value.endingInventoryStatus !== "confirmed") ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  if (
    value.endingInventoryStatus === "unconfirmed" &&
    value.endingInventory !== null
  ) {
    return null;
  }

  if (
    value.endingInventoryStatus === "confirmed" &&
    value.endingInventory === null
  ) {
    return null;
  }

  return {
    month: value.month,
    beginningInventory: value.beginningInventory,
    endingInventory: value.endingInventory,
    endingInventoryStatus: value.endingInventoryStatus,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function createEmptyStorage(): MonthlyInventoryStorageData {
  return { version: STORAGE_VERSION, records: {} };
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function saveStorage(data: MonthlyInventoryStorageData): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(MONTHLY_INVENTORY_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function getMonthlyInventoryRecords(): MonthlyInventoryStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyStorage();
  }

  try {
    const saved = storage.getItem(MONTHLY_INVENTORY_STORAGE_KEY);

    if (!saved) {
      return createEmptyStorage();
    }

    const value = JSON.parse(saved) as unknown;

    if (
      !isRecord(value) ||
      value.version !== STORAGE_VERSION ||
      !isRecord(value.records)
    ) {
      return createEmptyStorage();
    }

    const records = Object.fromEntries(
      Object.entries(value.records).flatMap(([month, candidate]) => {
        const record = parseRecord(candidate);

        return record && record.month === month ? [[month, record]] : [];
      }),
    );

    return { version: STORAGE_VERSION, records };
  } catch {
    return createEmptyStorage();
  }
}

export function getMonthlyInventoryRecord(
  month: InventoryMonth,
): MonthlyInventoryRecord | undefined {
  if (!isValidInventoryMonth(month)) {
    return undefined;
  }

  const record = getMonthlyInventoryRecords().records[month];
  return record ? { ...record } : undefined;
}

function updateRecord(
  month: InventoryMonth,
  update: Partial<
    Pick<
      MonthlyInventoryRecord,
      "beginningInventory" | "endingInventory" | "endingInventoryStatus"
    >
  >,
): boolean {
  if (!isValidInventoryMonth(month)) {
    return false;
  }

  const storage = getMonthlyInventoryRecords();
  const current = storage.records[month];
  const now = new Date().toISOString();
  const next = parseRecord({
    month,
    beginningInventory: null,
    endingInventory: null,
    endingInventoryStatus: "unconfirmed",
    createdAt: now,
    ...current,
    ...update,
    updatedAt: now,
  });

  if (!next) {
    return false;
  }

  return saveStorage({
    version: STORAGE_VERSION,
    records: { ...storage.records, [month]: next },
  });
}

export function saveBeginningInventory(
  month: InventoryMonth,
  amount: number,
): boolean {
  return updateRecord(month, { beginningInventory: amount });
}

export function saveEndingInventory(
  month: InventoryMonth,
  amount: number,
): boolean {
  return updateRecord(month, {
    endingInventory: amount,
    endingInventoryStatus: "confirmed",
  });
}

export function confirmNoEndingInventory(month: InventoryMonth): boolean {
  return saveEndingInventory(month, 0);
}

export function resetEndingInventory(month: InventoryMonth): boolean {
  return updateRecord(month, {
    endingInventory: null,
    endingInventoryStatus: "unconfirmed",
  });
}

export function deleteMonthlyInventoryRecord(
  month: InventoryMonth,
): boolean {
  if (!isValidInventoryMonth(month)) {
    return false;
  }

  const storage = getMonthlyInventoryRecords();
  const records = { ...storage.records };
  delete records[month];

  return saveStorage({ version: STORAGE_VERSION, records });
}
