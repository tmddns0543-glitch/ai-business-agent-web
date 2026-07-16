import { createMaterialVendorId } from "@/lib/material-vendor/create-material-vendor-id";
import {
  cleanMaterialVendorName,
  normalizeMaterialVendorName,
} from "@/lib/material-vendor/normalize-material-vendor-name";
import type {
  MaterialVendor,
  MaterialVendorStorageData,
} from "@/types/material-vendor";

export const MATERIAL_VENDOR_STORAGE_KEY = "material-vendors";

const MATERIAL_VENDOR_STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseVendor(value: unknown): MaterialVendor | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.trim().length === 0 ||
    typeof value.name !== "string" ||
    typeof value.normalizedName !== "string" ||
    typeof value.favorite !== "boolean" ||
    typeof value.usageCount !== "number" ||
    !Number.isInteger(value.usageCount) ||
    value.usageCount < 0 ||
    (value.lastUsedAt !== null && !isValidTimestamp(value.lastUsedAt)) ||
    !isValidTimestamp(value.createdAt) ||
    !isValidTimestamp(value.updatedAt)
  ) {
    return null;
  }

  const name = cleanMaterialVendorName(value.name);
  const normalizedName = normalizeMaterialVendorName(name);

  if (!name || normalizedName !== value.normalizedName) {
    return null;
  }

  return {
    id: value.id,
    name,
    normalizedName,
    favorite: value.favorite,
    usageCount: value.usageCount,
    lastUsedAt: value.lastUsedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function createEmptyStorage(): MaterialVendorStorageData {
  return {
    version: MATERIAL_VENDOR_STORAGE_VERSION,
    vendors: [],
  };
}

function sortVendors(vendors: readonly MaterialVendor[]): MaterialVendor[] {
  return [...vendors].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }

    const recentDifference =
      (right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0) -
      (left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0);

    if (recentDifference !== 0) {
      return recentDifference;
    }

    if (left.usageCount !== right.usageCount) {
      return right.usageCount - left.usageCount;
    }

    return left.name.localeCompare(right.name, "ko-KR");
  });
}

function parseStorage(value: unknown): MaterialVendorStorageData {
  if (
    !isRecord(value) ||
    value.version !== MATERIAL_VENDOR_STORAGE_VERSION ||
    !Array.isArray(value.vendors)
  ) {
    return createEmptyStorage();
  }

  const vendors: MaterialVendor[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  value.vendors.forEach((candidate) => {
    const vendor = parseVendor(candidate);

    if (
      !vendor ||
      ids.has(vendor.id) ||
      names.has(vendor.normalizedName)
    ) {
      return;
    }

    ids.add(vendor.id);
    names.add(vendor.normalizedName);
    vendors.push(vendor);
  });

  return {
    version: MATERIAL_VENDOR_STORAGE_VERSION,
    vendors: sortVendors(vendors),
  };
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function saveStorage(data: MaterialVendorStorageData): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(MATERIAL_VENDOR_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function cloneVendor(vendor: MaterialVendor): MaterialVendor {
  return { ...vendor };
}

export function getMaterialVendorStorage(): MaterialVendorStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyStorage();
  }

  try {
    const saved = storage.getItem(MATERIAL_VENDOR_STORAGE_KEY);

    return saved
      ? parseStorage(JSON.parse(saved) as unknown)
      : createEmptyStorage();
  } catch {
    return createEmptyStorage();
  }
}

export function getMaterialVendors(): MaterialVendor[] {
  return getMaterialVendorStorage().vendors.map(cloneVendor);
}

export function getMaterialVendorById(
  vendorId: string,
): MaterialVendor | undefined {
  const vendor = getMaterialVendors().find(({ id }) => id === vendorId);

  return vendor ? cloneVendor(vendor) : undefined;
}

export function findMaterialVendorByName(
  name: string,
): MaterialVendor | undefined {
  const normalizedName = normalizeMaterialVendorName(name);
  const vendor = getMaterialVendors().find(
    (candidate) => candidate.normalizedName === normalizedName,
  );

  return vendor ? cloneVendor(vendor) : undefined;
}

export function addMaterialVendor(name: string): MaterialVendor | null {
  const cleanedName = cleanMaterialVendorName(name);
  const normalizedName = normalizeMaterialVendorName(cleanedName);

  if (!cleanedName || !normalizedName) {
    return null;
  }

  const current = getMaterialVendorStorage();
  const existing = current.vendors.find(
    (vendor) => vendor.normalizedName === normalizedName,
  );

  if (existing) {
    return cloneVendor(existing);
  }

  const now = new Date().toISOString();
  const vendor: MaterialVendor = {
    id: createMaterialVendorId(),
    name: cleanedName,
    normalizedName,
    favorite: false,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return saveStorage({
    version: MATERIAL_VENDOR_STORAGE_VERSION,
    vendors: sortVendors([...current.vendors, vendor]),
  })
    ? cloneVendor(vendor)
    : null;
}

export function upsertMaterialVendorFromExpense(
  vendorName: string,
): MaterialVendor | null {
  const cleanedName = cleanMaterialVendorName(vendorName);
  const normalizedName = normalizeMaterialVendorName(cleanedName);

  if (!cleanedName || !normalizedName) {
    return null;
  }

  const current = getMaterialVendorStorage();
  const now = new Date().toISOString();
  const existingIndex = current.vendors.findIndex(
    (vendor) => vendor.normalizedName === normalizedName,
  );
  const vendor: MaterialVendor =
    existingIndex >= 0
      ? {
          ...current.vendors[existingIndex],
          usageCount: current.vendors[existingIndex].usageCount + 1,
          lastUsedAt: now,
          updatedAt: now,
        }
      : {
          id: createMaterialVendorId(),
          name: cleanedName,
          normalizedName,
          favorite: false,
          usageCount: 1,
          lastUsedAt: now,
          createdAt: now,
          updatedAt: now,
        };
  const vendors =
    existingIndex >= 0
      ? current.vendors.map((candidate, index) =>
          index === existingIndex ? vendor : candidate,
        )
      : [...current.vendors, vendor];

  return saveStorage({
    version: MATERIAL_VENDOR_STORAGE_VERSION,
    vendors: sortVendors(vendors),
  })
    ? cloneVendor(vendor)
    : null;
}

export function setMaterialVendorFavorite(
  vendorId: string,
  favorite: boolean,
): boolean {
  const current = getMaterialVendorStorage();
  const index = current.vendors.findIndex(({ id }) => id === vendorId);

  if (index < 0) {
    return false;
  }

  const now = new Date().toISOString();
  const vendors = current.vendors.map((vendor, position) =>
    position === index
      ? { ...vendor, favorite, updatedAt: now }
      : vendor,
  );

  return saveStorage({
    version: MATERIAL_VENDOR_STORAGE_VERSION,
    vendors: sortVendors(vendors),
  });
}
