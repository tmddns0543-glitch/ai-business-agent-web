import type { StoreSettings } from "@/types/inventory";

export const STORE_SETTINGS_STORAGE_KEY = "store-settings";

const STORAGE_VERSION = 1;

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function createDefaultSettings(): StoreSettings {
  return {
    version: STORAGE_VERSION,
    inventoryProfitEnabled: false,
  };
}

export function getStoreSettings(): StoreSettings {
  const storage = getLocalStorage();

  if (!storage) {
    return createDefaultSettings();
  }

  try {
    const saved = storage.getItem(STORE_SETTINGS_STORAGE_KEY);

    if (!saved) {
      return createDefaultSettings();
    }

    const value = JSON.parse(saved) as unknown;

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return createDefaultSettings();
    }

    const record = value as Record<string, unknown>;

    return {
      version: STORAGE_VERSION,
      inventoryProfitEnabled:
        typeof record.inventoryProfitEnabled === "boolean"
          ? record.inventoryProfitEnabled
          : false,
    };
  } catch {
    return createDefaultSettings();
  }
}

export function setInventoryProfitEnabled(enabled: boolean): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      STORE_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...getStoreSettings(),
        inventoryProfitEnabled: enabled,
      } satisfies StoreSettings),
    );
    return true;
  } catch {
    return false;
  }
}
