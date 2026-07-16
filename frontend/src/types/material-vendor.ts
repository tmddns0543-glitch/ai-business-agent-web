export interface MaterialVendor {
  id: string;
  name: string;
  normalizedName: string;
  favorite: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialVendorStorageData {
  version: 1;
  vendors: MaterialVendor[];
}

export interface MaterialVendorSuggestion {
  id: string | null;
  name: string;
  normalizedName: string;
  favorite: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  source: "vendor-storage" | "expense-history";
}
