import type { ExpensePlatformId } from "@/types/expense";

export type PlatformCostInputValues = Record<
  string,
  Record<ExpensePlatformId, number>
>;

export interface PlatformCostInputSummary {
  total: number;
  byItem: Record<string, number>;
  byPlatform: Record<ExpensePlatformId, number>;
}

const PLATFORM_IDS: readonly ExpensePlatformId[] = [
  "baemin",
  "coupang-eats",
  "yogiyo",
  "ddangyo",
];

function normalizeAmount(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function calculatePlatformCostInputSummary(
  values: PlatformCostInputValues,
): PlatformCostInputSummary {
  const byPlatform: Record<ExpensePlatformId, number> = {
    baemin: 0,
    "coupang-eats": 0,
    yogiyo: 0,
    ddangyo: 0,
  };
  const byItem: Record<string, number> = {};
  let total = 0;

  Object.entries(values).forEach(([itemId, platformValues]) => {
    const itemTotal = PLATFORM_IDS.reduce((sum, platformId) => {
      const amount = normalizeAmount(platformValues[platformId]);

      byPlatform[platformId] += amount;
      return sum + amount;
    }, 0);

    byItem[itemId] = itemTotal;
    total += itemTotal;
  });

  return {
    total,
    byItem,
    byPlatform,
  };
}
