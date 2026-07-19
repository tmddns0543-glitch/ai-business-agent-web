import type { StoredSalesByPlatform } from "@/lib/settlement/map-sales-to-settlement-items";
import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type { BusinessDaySalesStorageData } from "@/types/sales-by-business-day";
import type { SettlementPlatformId } from "@/types/settlement";

export const BUSINESS_DAY_SALES_STORAGE_KEY = "business-day-sales";

const BUSINESS_DAY_SALES_STORAGE_VERSION = 1;

const PLATFORM_IDS: readonly SettlementPlatformId[] = [
  "baemin",
  "coupang-eats",
  "yogiyo",
  "ddangyo",
  "general",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copySalesObject(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? { ...value } : null;
}

function copySalesByPlatform(value: unknown): StoredSalesByPlatform {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    PLATFORM_IDS.flatMap((platformId) => {
      const sales = copySalesObject(value[platformId]);

      return sales ? [[platformId, sales]] : [];
    }),
  );
}

function createEmptyStorage(): BusinessDaySalesStorageData {
  return {
    version: BUSINESS_DAY_SALES_STORAGE_VERSION,
    days: {},
  };
}

function parseStorage(value: unknown): BusinessDaySalesStorageData {
  if (
    !isRecord(value) ||
    value.version !== BUSINESS_DAY_SALES_STORAGE_VERSION ||
    !isRecord(value.days)
  ) {
    return createEmptyStorage();
  }

  const days = Object.fromEntries(
    Object.entries(value.days).flatMap(([businessDate, sales]) =>
      isValidBusinessDate(businessDate) && isRecord(sales)
        ? [[businessDate, copySalesByPlatform(sales)]]
        : [],
    ),
  );

  return {
    version: BUSINESS_DAY_SALES_STORAGE_VERSION,
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

export function getBusinessDaySalesStorage(): BusinessDaySalesStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyStorage();
  }

  try {
    const saved = storage.getItem(BUSINESS_DAY_SALES_STORAGE_KEY);

    return saved ? parseStorage(JSON.parse(saved) as unknown) : createEmptyStorage();
  } catch {
    return createEmptyStorage();
  }
}

export function getSalesByBusinessDate(
  businessDate: BusinessDate,
): StoredSalesByPlatform {
  if (!isValidBusinessDate(businessDate)) {
    return {};
  }

  const sales = getBusinessDaySalesStorage().days[businessDate];

  return copySalesByPlatform(sales);
}

export function getPlatformSalesByBusinessDate(
  businessDate: BusinessDate,
  platformId: SettlementPlatformId,
): Record<string, unknown> {
  const sales = getSalesByBusinessDate(businessDate)[platformId];

  return copySalesObject(sales) ?? {};
}

export function savePlatformSalesByBusinessDate(
  businessDate: BusinessDate,
  platformId: SettlementPlatformId,
  sales: Readonly<Record<string, unknown>>,
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  const current = getBusinessDaySalesStorage();
  const currentDay = copySalesByPlatform(current.days[businessDate]);
  const next: BusinessDaySalesStorageData = {
    version: BUSINESS_DAY_SALES_STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: {
        ...currentDay,
        [platformId]: { ...sales },
      },
    },
  };

  try {
    storage.setItem(BUSINESS_DAY_SALES_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function removeSalesByBusinessDate(
  businessDate: BusinessDate,
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  const current = getBusinessDaySalesStorage();
  const nextDays = { ...current.days };

  delete nextDays[businessDate];

  try {
    storage.setItem(
      BUSINESS_DAY_SALES_STORAGE_KEY,
      JSON.stringify({
        version: BUSINESS_DAY_SALES_STORAGE_VERSION,
        days: nextDays,
      } satisfies BusinessDaySalesStorageData),
    );
    return true;
  } catch {
    return false;
  }
}

export function replaceSalesByBusinessDate(
  businessDate: BusinessDate,
  sales: StoredSalesByPlatform,
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  const current = getBusinessDaySalesStorage();

  try {
    storage.setItem(
      BUSINESS_DAY_SALES_STORAGE_KEY,
      JSON.stringify({
        version: BUSINESS_DAY_SALES_STORAGE_VERSION,
        days: {
          ...current.days,
          [businessDate]: copySalesByPlatform(sales),
        },
      } satisfies BusinessDaySalesStorageData),
    );
    return true;
  } catch {
    return false;
  }
}
