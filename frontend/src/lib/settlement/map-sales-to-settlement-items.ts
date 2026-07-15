import {
  SETTLEMENT_CHANNEL_IDS,
  type SettlementChannelId,
  type SettlementPlatformId,
} from "@/types/settlement";

export interface SettlementSalesItem {
  readonly channelId: SettlementChannelId;
  readonly salesAmount: number;
  readonly orderCount: number;
}

export type StoredSalesByPlatform = Partial<
  Record<SettlementPlatformId, unknown>
>;

type PlatformSalesMapper = (sales: unknown) => SettlementSalesItem[];

const PLATFORM_IDS: readonly SettlementPlatformId[] = [
  "baemin",
  "coupang-eats",
  "yogiyo",
  "ddangyo",
  "general",
];

const NUMBER_STRING_PATTERN =
  /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStoredNumber(value: unknown) {
  let normalizedValue: number;

  if (typeof value === "number") {
    normalizedValue = value;
  } else if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!NUMBER_STRING_PATTERN.test(trimmedValue)) {
      return 0;
    }

    normalizedValue = Number(trimmedValue.replaceAll(",", ""));
  } else {
    return 0;
  }

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    return 0;
  }

  return normalizedValue;
}

function normalizeStoredOrderCount(value: unknown) {
  return Math.floor(normalizeStoredNumber(value));
}

function readStoredField(sales: unknown, field: string) {
  if (!isRecord(sales)) {
    return 0;
  }

  return normalizeStoredNumber(sales[field]);
}

function readStoredOrderCount(sales: unknown, field: string) {
  if (!isRecord(sales)) {
    return 0;
  }

  return normalizeStoredOrderCount(sales[field]);
}

export function mapBaeminSalesToSettlementItems(
  sales: unknown,
): SettlementSalesItem[] {
  return [
    {
      channelId: SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_PREPAID,
      salesAmount: readStoredField(sales, "prepaid"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_CARD,
      salesAmount: readStoredField(sales, "card"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_CASH,
      salesAmount: readStoredField(sales, "cash"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.BAEMIN_ONE,
      salesAmount: readStoredField(sales, "baeminOne"),
      orderCount: readStoredOrderCount(sales, "baeminOneOrders"),
    },
  ];
}

export function mapCoupangEatsSalesToSettlementItems(
  sales: unknown,
): SettlementSalesItem[] {
  return [
    {
      channelId: SETTLEMENT_CHANNEL_IDS.COUPANG_EATS_DELIVERY,
      salesAmount: readStoredField(sales, "sales"),
      orderCount: readStoredOrderCount(sales, "orders"),
    },
  ];
}

export function mapYogiyoSalesToSettlementItems(
  sales: unknown,
): SettlementSalesItem[] {
  return [
    {
      channelId: SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_PREPAID,
      salesAmount: readStoredField(sales, "prepaid"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_CARD,
      salesAmount: readStoredField(sales, "card"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_CASH,
      salesAmount: readStoredField(sales, "cash"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.YOGIYO_DELIVERY,
      salesAmount: readStoredField(sales, "yogiDelivery"),
      orderCount: readStoredOrderCount(sales, "yogiDeliveryOrders"),
    },
  ];
}

export function mapDdangyoSalesToSettlementItems(
  sales: unknown,
): SettlementSalesItem[] {
  return [
    {
      channelId: SETTLEMENT_CHANNEL_IDS.DDANGYO_SHOP_DELIVERY_PREPAID,
      salesAmount: readStoredField(sales, "prepaid"),
      orderCount: 0,
    },
  ];
}

export function mapGeneralSalesToSettlementItems(
  sales: unknown,
): SettlementSalesItem[] {
  return [
    {
      channelId: SETTLEMENT_CHANNEL_IDS.GENERAL_CARD,
      salesAmount: readStoredField(sales, "card"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.GENERAL_CASH,
      salesAmount: readStoredField(sales, "cash"),
      orderCount: 0,
    },
    {
      channelId: SETTLEMENT_CHANNEL_IDS.GENERAL_BANK_TRANSFER,
      salesAmount: readStoredField(sales, "bankTransfer"),
      orderCount: 0,
    },
  ];
}

const PLATFORM_MAPPERS: Record<
  SettlementPlatformId,
  PlatformSalesMapper
> = {
  baemin: mapBaeminSalesToSettlementItems,
  "coupang-eats": mapCoupangEatsSalesToSettlementItems,
  yogiyo: mapYogiyoSalesToSettlementItems,
  ddangyo: mapDdangyoSalesToSettlementItems,
  general: mapGeneralSalesToSettlementItems,
};

export function mapPlatformSalesToSettlementItems(
  platformId: SettlementPlatformId,
  sales: unknown,
): SettlementSalesItem[] {
  return PLATFORM_MAPPERS[platformId](sales);
}

export function mapAllSalesToSettlementItems(
  salesByPlatform: StoredSalesByPlatform,
): SettlementSalesItem[] {
  return PLATFORM_IDS.flatMap((platformId) =>
    mapPlatformSalesToSettlementItems(
      platformId,
      salesByPlatform[platformId],
    ),
  );
}
