import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type { DailyExpenseMemo } from "@/types/expense";
import type { DailyExpenseMemoStorageData } from "@/types/expense-storage";

export const BUSINESS_DAY_EXPENSE_MEMOS_STORAGE_KEY =
  "business-day-expense-memos";

const DAILY_MEMO_STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMemo(value: unknown): DailyExpenseMemo | null {
  if (
    !isRecord(value) ||
    !isValidBusinessDate(value.businessDate) ||
    typeof value.memo !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    businessDate: value.businessDate,
    memo: value.memo,
    updatedAt: value.updatedAt,
  };
}

function createEmptyStorage(): DailyExpenseMemoStorageData {
  return {
    version: DAILY_MEMO_STORAGE_VERSION,
    days: {},
  };
}

function parseStorage(value: unknown): DailyExpenseMemoStorageData {
  if (
    !isRecord(value) ||
    value.version !== DAILY_MEMO_STORAGE_VERSION ||
    !isRecord(value.days)
  ) {
    return createEmptyStorage();
  }

  const days = Object.fromEntries(
    Object.entries(value.days).flatMap(([businessDate, valueMemo]) => {
      const memo = parseMemo(valueMemo);

      return isValidBusinessDate(businessDate) &&
        memo?.businessDate === businessDate
        ? [[businessDate, memo]]
        : [];
    }),
  );

  return {
    version: DAILY_MEMO_STORAGE_VERSION,
    days,
  };
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function saveStorage(data: DailyExpenseMemoStorageData): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      BUSINESS_DAY_EXPENSE_MEMOS_STORAGE_KEY,
      JSON.stringify(data),
    );
    return true;
  } catch {
    return false;
  }
}

export function getDailyExpenseMemoStorage(): DailyExpenseMemoStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyStorage();
  }

  try {
    const saved = storage.getItem(BUSINESS_DAY_EXPENSE_MEMOS_STORAGE_KEY);

    return saved ? parseStorage(JSON.parse(saved) as unknown) : createEmptyStorage();
  } catch {
    return createEmptyStorage();
  }
}

export function getDailyExpenseMemo(
  businessDate: BusinessDate,
): DailyExpenseMemo | undefined {
  if (!isValidBusinessDate(businessDate)) {
    return undefined;
  }

  const memo = getDailyExpenseMemoStorage().days[businessDate];

  return memo ? { ...memo } : undefined;
}

export function saveDailyExpenseMemo(
  businessDate: BusinessDate,
  memo: string,
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const trimmedMemo = memo.trim();

  if (trimmedMemo.length === 0) {
    return removeDailyExpenseMemo(businessDate);
  }

  const current = getDailyExpenseMemoStorage();

  return saveStorage({
    version: DAILY_MEMO_STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: {
        businessDate,
        memo: trimmedMemo,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

export function removeDailyExpenseMemo(
  businessDate: BusinessDate,
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const current = getDailyExpenseMemoStorage();
  const nextDays = { ...current.days };

  delete nextDays[businessDate];

  return saveStorage({
    version: DAILY_MEMO_STORAGE_VERSION,
    days: nextDays,
  });
}
