import { normalizeMaterialVendorName } from "@/lib/material-vendor/normalize-material-vendor-name";
import { getAllExpenseTransactions } from "@/lib/storage/expense-by-business-day-storage";
import { getMaterialVendors } from "@/lib/storage/material-vendor-storage";
import type { MaterialVendorSuggestion } from "@/types/material-vendor";

function compareSuggestions(
  left: MaterialVendorSuggestion,
  right: MaterialVendorSuggestion,
) {
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
}

export function getMaterialVendorSuggestions(): MaterialVendorSuggestion[] {
  const savedSuggestions = getMaterialVendors().map<MaterialVendorSuggestion>(
    (vendor) => ({
      ...vendor,
      source: "vendor-storage",
    }),
  );
  const suggestionsByName = new Map(
    savedSuggestions.map((suggestion) => [
      suggestion.normalizedName,
      suggestion,
    ]),
  );

  getAllExpenseTransactions().forEach((transaction) => {
    if (
      transaction.group !== "material-purchase" ||
      !transaction.vendorName
    ) {
      return;
    }

    const name = transaction.vendorName.trim().replace(/\s+/g, " ");
    const normalizedName = normalizeMaterialVendorName(name);

    if (!normalizedName) {
      return;
    }

    const existing = suggestionsByName.get(normalizedName);

    if (existing?.source === "vendor-storage") {
      return;
    }

    const lastUsedAt =
      !existing?.lastUsedAt ||
      Date.parse(transaction.updatedAt) > Date.parse(existing.lastUsedAt)
        ? transaction.updatedAt
        : existing.lastUsedAt;

    suggestionsByName.set(normalizedName, {
      id: null,
      name,
      normalizedName,
      favorite: false,
      usageCount: (existing?.usageCount ?? 0) + 1,
      lastUsedAt,
      source: "expense-history",
    });
  });

  return [...suggestionsByName.values()].sort(compareSuggestions);
}

export function filterMaterialVendorSuggestions(
  suggestions: readonly MaterialVendorSuggestion[],
  query: string,
  limit = 6,
): MaterialVendorSuggestion[] {
  const normalizedQuery = normalizeMaterialVendorName(query);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 6;

  if (!normalizedQuery) {
    return [...suggestions].sort(compareSuggestions).slice(0, safeLimit);
  }

  return suggestions
    .filter(({ normalizedName }) => normalizedName.includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = left.normalizedName.startsWith(normalizedQuery);
      const rightStarts = right.normalizedName.startsWith(normalizedQuery);

      if (leftStarts !== rightStarts) {
        return leftStarts ? -1 : 1;
      }

      return compareSuggestions(left, right);
    })
    .slice(0, safeLimit);
}
