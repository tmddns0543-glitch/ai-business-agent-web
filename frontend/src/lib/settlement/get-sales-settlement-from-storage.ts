import {
  calculateSalesSettlement,
  type SalesSettlementSummary,
} from "@/lib/settlement/calculate-sales-settlement";
import type { StoredSalesByPlatform } from "@/lib/settlement/map-sales-to-settlement-items";
import { getBusinessFeeSettings } from "@/lib/storage/fee-settings-storage";
import type { SettlementPlatformId } from "@/types/settlement";

const SALES_STORAGE_KEYS = {
  baemin: "sales-baemin",
  "coupang-eats": "sales-coupang-eats",
  yogiyo: "sales-yogiyo",
  ddangyo: "sales-ddangyo",
  general: "sales-general",
} as const satisfies Readonly<Record<SettlementPlatformId, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredSalesObject(
  storage: Storage | null,
  key: string,
): Record<string, unknown> {
  if (!storage) {
    return {};
  }

  try {
    const savedValue = storage.getItem(key);

    if (!savedValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(savedValue);

    return isRecord(parsedValue) ? parsedValue : {};
  } catch {
    return {};
  }
}

export function getStoredSalesByPlatform(): StoredSalesByPlatform {
  const storage = getLocalStorage();

  return {
    baemin: readStoredSalesObject(storage, SALES_STORAGE_KEYS.baemin),
    "coupang-eats": readStoredSalesObject(
      storage,
      SALES_STORAGE_KEYS["coupang-eats"],
    ),
    yogiyo: readStoredSalesObject(storage, SALES_STORAGE_KEYS.yogiyo),
    ddangyo: readStoredSalesObject(storage, SALES_STORAGE_KEYS.ddangyo),
    general: readStoredSalesObject(storage, SALES_STORAGE_KEYS.general),
  };
}

export function getSalesSettlementFromStorage(): SalesSettlementSummary {
  const salesByPlatform = getStoredSalesByPlatform();
  const settings = getBusinessFeeSettings();

  return calculateSalesSettlement(salesByPlatform, settings);
}
