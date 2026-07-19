import { BUSINESS_DAY_CONTEXT_STORAGE_KEY } from "@/lib/storage/business-day-storage";
import { BUSINESS_DAY_CLOSING_STATUS_STORAGE_KEY } from "@/lib/storage/closing-status-by-business-day-storage";
import { BUSINESS_DAY_EXPENSE_MEMOS_STORAGE_KEY } from "@/lib/storage/daily-expense-memo-storage";
import {
  BUSINESS_DAY_DELIVERY_TRANSACTIONS_STORAGE_KEY,
  DELIVERY_AGENCIES_STORAGE_KEY,
} from "@/lib/storage/delivery-agency-storage";
import { BUSINESS_DAY_EXPENSES_STORAGE_KEY } from "@/lib/storage/expense-by-business-day-storage";
import { EXPENSE_CUSTOM_ITEMS_STORAGE_KEY } from "@/lib/storage/expense-custom-items-storage";
import { BUSINESS_FEE_SETTINGS_STORAGE_KEY } from "@/lib/storage/fee-settings-storage";
import { MATERIAL_VENDOR_STORAGE_KEY } from "@/lib/storage/material-vendor-storage";
import { MONTHLY_INVENTORY_STORAGE_KEY } from "@/lib/storage/monthly-inventory-storage";
import { BUSINESS_DAY_SALES_STORAGE_KEY } from "@/lib/storage/sales-by-business-day-storage";
import { STORE_SETTINGS_STORAGE_KEY } from "@/lib/storage/store-settings-storage";
import { isValidBusinessDate } from "@/types/business-day";

export const APP_BACKUP_NAME = "AI Business Agent";
export const APP_BACKUP_FORMAT_VERSION = 1;

export const APP_LOCAL_STORAGE_KEYS = [
  BUSINESS_DAY_CONTEXT_STORAGE_KEY,
  BUSINESS_DAY_CLOSING_STATUS_STORAGE_KEY,
  BUSINESS_DAY_EXPENSE_MEMOS_STORAGE_KEY,
  BUSINESS_DAY_DELIVERY_TRANSACTIONS_STORAGE_KEY,
  BUSINESS_DAY_EXPENSES_STORAGE_KEY,
  BUSINESS_DAY_SALES_STORAGE_KEY,
  DELIVERY_AGENCIES_STORAGE_KEY,
  BUSINESS_FEE_SETTINGS_STORAGE_KEY,
  EXPENSE_CUSTOM_ITEMS_STORAGE_KEY,
  MATERIAL_VENDOR_STORAGE_KEY,
  MONTHLY_INVENTORY_STORAGE_KEY,
  STORE_SETTINGS_STORAGE_KEY,
] as const;

export type AppLocalStorageKey = (typeof APP_LOCAL_STORAGE_KEYS)[number];

export type AppBackupDocument = {
  app: typeof APP_BACKUP_NAME;
  formatVersion: typeof APP_BACKUP_FORMAT_VERSION;
  exportedAt: string;
  data: Partial<Record<AppLocalStorageKey, string>>;
};

export type BackupValidationResult =
  | { valid: true; backup: AppBackupDocument }
  | { valid: false; error: string };

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const APP_LOCAL_STORAGE_KEY_SET = new Set<string>(APP_LOCAL_STORAGE_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsDangerousKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsDangerousKey);
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(
    ([key, child]) => DANGEROUS_KEYS.has(key) || containsDangerousKey(child),
  );
}

function hasVersionOne(record: Record<string, unknown>): boolean {
  return record.version === 1;
}

function hasExpectedStorageShape(
  key: AppLocalStorageKey,
  value: unknown,
): boolean {
  if (!isRecord(value) || containsDangerousKey(value)) {
    return false;
  }

  if (key === BUSINESS_DAY_CONTEXT_STORAGE_KEY) {
    return (
      hasVersionOne(value) && isValidBusinessDate(value.selectedBusinessDate)
    );
  }

  if (key === BUSINESS_FEE_SETTINGS_STORAGE_KEY) {
    return hasVersionOne(value) && isRecord(value.channels);
  }

  if (key === DELIVERY_AGENCIES_STORAGE_KEY) {
    return hasVersionOne(value) && Array.isArray(value.agencies);
  }

  if (key === EXPENSE_CUSTOM_ITEMS_STORAGE_KEY) {
    return hasVersionOne(value) && Array.isArray(value.items);
  }

  if (key === MATERIAL_VENDOR_STORAGE_KEY) {
    return hasVersionOne(value) && Array.isArray(value.vendors);
  }

  if (key === MONTHLY_INVENTORY_STORAGE_KEY) {
    return hasVersionOne(value) && isRecord(value.records);
  }

  if (key === STORE_SETTINGS_STORAGE_KEY) {
    return (
      hasVersionOne(value) &&
      typeof value.inventoryProfitEnabled === "boolean"
    );
  }

  return hasVersionOne(value) && isRecord(value.days);
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function formatLocalTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

export function createAppBackupDocument(): AppBackupDocument | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const data: Partial<Record<AppLocalStorageKey, string>> = {};

  APP_LOCAL_STORAGE_KEYS.forEach((key) => {
    const value = storage.getItem(key);

    if (value !== null) {
      data[key] = value;
    }
  });

  return {
    app: APP_BACKUP_NAME,
    formatVersion: APP_BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function hasBackupData(backup: AppBackupDocument): boolean {
  return Object.keys(backup.data).length > 0;
}

export function downloadAppBackup(
  backup: AppBackupDocument,
  filenamePrefix = "ai-business-agent-backup",
): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return false;
  }

  let objectUrl: string | null = null;

  try {
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${filenamePrefix}-${formatLocalTimestamp(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    return false;
  }
}

export function validateAppBackupText(text: string): BackupValidationResult {
  let candidate: unknown;

  try {
    candidate = JSON.parse(text) as unknown;
  } catch {
    return { valid: false, error: "JSON 파일을 읽을 수 없습니다." };
  }

  if (!isRecord(candidate) || containsDangerousKey(candidate)) {
    return { valid: false, error: "안전하지 않거나 잘못된 백업 파일입니다." };
  }

  if (candidate.app !== APP_BACKUP_NAME) {
    return { valid: false, error: "다른 서비스에서 생성된 백업 파일입니다." };
  }

  if (candidate.formatVersion !== APP_BACKUP_FORMAT_VERSION) {
    return { valid: false, error: "지원하지 않는 백업 파일 버전입니다." };
  }

  if (!isRecord(candidate.data)) {
    return { valid: false, error: "백업 데이터 구조가 올바르지 않습니다." };
  }

  const data: Partial<Record<AppLocalStorageKey, string>> = {};

  for (const [key, rawValue] of Object.entries(candidate.data)) {
    if (!APP_LOCAL_STORAGE_KEY_SET.has(key)) {
      return { valid: false, error: `허용되지 않은 데이터 항목이 있습니다: ${key}` };
    }

    if (typeof rawValue !== "string") {
      return { valid: false, error: "백업 데이터 값은 문자열이어야 합니다." };
    }

    let parsedValue: unknown;

    try {
      parsedValue = JSON.parse(rawValue) as unknown;
    } catch {
      return { valid: false, error: `${key} 데이터가 손상되었습니다.` };
    }

    const appKey = key as AppLocalStorageKey;

    if (!hasExpectedStorageShape(appKey, parsedValue)) {
      return { valid: false, error: `${key} 데이터 구조가 올바르지 않습니다.` };
    }

    data[appKey] = rawValue;
  }

  if (
    typeof candidate.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(candidate.exportedAt))
  ) {
    return { valid: false, error: "백업 생성 시간이 올바르지 않습니다." };
  }

  return {
    valid: true,
    backup: {
      app: APP_BACKUP_NAME,
      formatVersion: APP_BACKUP_FORMAT_VERSION,
      exportedAt: candidate.exportedAt,
      data,
    },
  };
}

export function restoreAppBackup(backup: AppBackupDocument): boolean {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  const previousValues = new Map<AppLocalStorageKey, string | null>(
    APP_LOCAL_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]),
  );

  try {
    APP_LOCAL_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
    Object.entries(backup.data).forEach(([key, value]) => {
      if (typeof value === "string") {
        storage.setItem(key, value);
      }
    });

    const restoredExactly = APP_LOCAL_STORAGE_KEYS.every(
      (key) => storage.getItem(key) === (backup.data[key] ?? null),
    );

    if (!restoredExactly) {
      throw new Error("Restore verification failed");
    }

    return true;
  } catch {
    try {
      APP_LOCAL_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
      previousValues.forEach((value, key) => {
        if (value !== null) {
          storage.setItem(key, value);
        }
      });
    } catch {
      return false;
    }

    return false;
  }
}
