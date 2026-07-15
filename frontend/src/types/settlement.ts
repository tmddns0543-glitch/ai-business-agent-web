export type SettlementPlatformId =
  | "baemin"
  | "coupang-eats"
  | "yogiyo"
  | "ddangyo"
  | "general";

export const SETTLEMENT_CHANNEL_IDS = {
  BAEMIN_SHOP_DELIVERY_PREPAID: "baemin.shop-delivery-prepaid",
  BAEMIN_SHOP_DELIVERY_CARD: "baemin.shop-delivery-card",
  BAEMIN_SHOP_DELIVERY_CASH: "baemin.shop-delivery-cash",
  BAEMIN_ONE: "baemin.baemin-one",
  COUPANG_EATS_DELIVERY: "coupang-eats.delivery",
  YOGIYO_SHOP_DELIVERY_PREPAID: "yogiyo.shop-delivery-prepaid",
  YOGIYO_SHOP_DELIVERY_CARD: "yogiyo.shop-delivery-card",
  YOGIYO_SHOP_DELIVERY_CASH: "yogiyo.shop-delivery-cash",
  YOGIYO_DELIVERY: "yogiyo.yogi-delivery",
  DDANGYO_SHOP_DELIVERY_PREPAID: "ddangyo.shop-delivery-prepaid",
  GENERAL_CARD: "general.card",
  GENERAL_CASH: "general.cash",
  GENERAL_BANK_TRANSFER: "general.bank-transfer",
} as const;

export type SettlementChannelId =
  (typeof SETTLEMENT_CHANNEL_IDS)[keyof typeof SETTLEMENT_CHANNEL_IDS];

export type TransactionFeeType = "payment" | "card" | "none";

export type VatTarget =
  | "brokerageFee"
  | "paymentFee"
  | "cardFee"
  | "deliveryFee";

export interface SettlementChannelSetting {
  readonly channelId: SettlementChannelId;
  readonly platformId: SettlementPlatformId;
  readonly label: string;
  readonly enabled: boolean;
  readonly brokerageRate: number;
  readonly transactionFeeType: TransactionFeeType;
  readonly paymentRate: number;
  readonly cardRate: number;
  readonly deliveryFeePerOrder: number;
  readonly usesOrderCount: boolean;
  readonly vatRate: number;
  readonly vatTargets: readonly VatTarget[];
}

export interface BusinessFeeSettings {
  readonly version: number;
  readonly channels: Readonly<
    Record<SettlementChannelId, SettlementChannelSetting>
  >;
}

export interface SettlementCalculationInput {
  channelId: SettlementChannelId;
  salesAmount: number;
  orderCount: number;
  setting: SettlementChannelSetting;
}

export interface SettlementResult {
  grossSales: number;
  brokerageFee: number;
  paymentFee: number;
  cardFee: number;
  deliveryFee: number;
  vat: number;
  expectedDeduction: number;
  expectedSettlement: number;
}
