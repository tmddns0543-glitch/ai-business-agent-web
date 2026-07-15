import { DEFAULT_SETTLEMENT_SETTINGS } from "@/data/settlement-default-settings";
import { calculateItemSettlement } from "@/lib/settlement/calculate-item-settlement";
import { calculatePlatformSettlement } from "@/lib/settlement/calculate-platform-settlement";
import { calculateTotalSettlement } from "@/lib/settlement/calculate-total-settlement";
import {
  mapAllSalesToSettlementItems,
  type StoredSalesByPlatform,
} from "@/lib/settlement/map-sales-to-settlement-items";
import type {
  BusinessFeeSettings,
  SettlementChannelId,
  SettlementPlatformId,
  SettlementResult,
} from "@/types/settlement";

export interface SettlementItemResult {
  readonly channelId: SettlementChannelId;
  readonly platformId: SettlementPlatformId;
  readonly label: string;
  readonly enabled: boolean;
  readonly salesAmount: number;
  readonly orderCount: number;
  readonly result: SettlementResult;
}

export interface SalesSettlementSummary {
  readonly items: readonly SettlementItemResult[];
  readonly platforms: Readonly<
    Record<SettlementPlatformId, SettlementResult>
  >;
  readonly total: SettlementResult;
}

const PLATFORM_IDS: readonly SettlementPlatformId[] = [
  "baemin",
  "coupang-eats",
  "yogiyo",
  "ddangyo",
  "general",
];

export function calculateSalesSettlement(
  salesByPlatform: StoredSalesByPlatform,
  settings: BusinessFeeSettings,
): SalesSettlementSummary {
  const salesItems = mapAllSalesToSettlementItems(salesByPlatform);

  const items = salesItems.map<SettlementItemResult>((item) => {
    const setting =
      settings.channels?.[item.channelId] ??
      DEFAULT_SETTLEMENT_SETTINGS.channels[item.channelId];

    return {
      channelId: item.channelId,
      platformId: setting.platformId,
      label: setting.label,
      enabled: setting.enabled,
      salesAmount: item.salesAmount,
      orderCount: item.orderCount,
      result: calculateItemSettlement({
        channelId: item.channelId,
        salesAmount: item.salesAmount,
        orderCount: item.orderCount,
        setting,
      }),
    };
  });

  const platformResults = Object.fromEntries(
    PLATFORM_IDS.map((platformId) => [
      platformId,
      calculatePlatformSettlement(
        items
          .filter((item) => item.platformId === platformId)
          .map((item) => item.result),
      ),
    ]),
  ) as Record<SettlementPlatformId, SettlementResult>;

  const total = calculateTotalSettlement(
    PLATFORM_IDS.map((platformId) => platformResults[platformId]),
  );

  return {
    items,
    platforms: platformResults,
    total,
  };
}
