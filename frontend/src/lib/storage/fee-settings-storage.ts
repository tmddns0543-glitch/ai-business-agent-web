import {
  DEFAULT_SETTLEMENT_SETTINGS,
  SETTLEMENT_SETTINGS_VERSION,
} from "@/data/settlement-default-settings";
import {
  SETTLEMENT_CHANNEL_IDS,
  type BusinessFeeSettings,
  type SettlementChannelId,
  type SettlementChannelSetting,
  type TransactionFeeType,
  type VatTarget,
} from "@/types/settlement";

export const BUSINESS_FEE_SETTINGS_STORAGE_KEY =
  "business-fee-settings";

type ChannelSettingUpdate = Partial<
  Omit<SettlementChannelSetting, "channelId" | "platformId">
>;

const CHANNEL_IDS = Object.values(SETTLEMENT_CHANNEL_IDS);

const TRANSACTION_FEE_TYPES: readonly TransactionFeeType[] = [
  "payment",
  "card",
  "none",
];

const VAT_TARGETS: readonly VatTarget[] = [
  "brokerageFee",
  "paymentFee",
  "cardFee",
  "deliveryFee",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransactionFeeType(
  value: unknown,
): value is TransactionFeeType {
  return (
    typeof value === "string" &&
    TRANSACTION_FEE_TYPES.some((type) => type === value)
  );
}

function isVatTarget(value: unknown): value is VatTarget {
  return (
    typeof value === "string" &&
    VAT_TARGETS.some((target) => target === value)
  );
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readVatTargets(
  value: unknown,
  fallback: readonly VatTarget[],
) {
  if (!Array.isArray(value) || !value.every(isVatTarget)) {
    return fallback;
  }

  return value;
}

function mergeChannelSetting(
  defaultSetting: SettlementChannelSetting,
  savedSetting: unknown,
): SettlementChannelSetting {
  if (!isRecord(savedSetting)) {
    return defaultSetting;
  }

  return {
    channelId: defaultSetting.channelId,
    platformId: defaultSetting.platformId,
    label:
      typeof savedSetting.label === "string"
        ? savedSetting.label
        : defaultSetting.label,
    enabled:
      typeof savedSetting.enabled === "boolean"
        ? savedSetting.enabled
        : defaultSetting.enabled,
    brokerageRate: readNumber(
      savedSetting.brokerageRate,
      defaultSetting.brokerageRate,
    ),
    transactionFeeType: isTransactionFeeType(
      savedSetting.transactionFeeType,
    )
      ? savedSetting.transactionFeeType
      : defaultSetting.transactionFeeType,
    paymentRate: readNumber(
      savedSetting.paymentRate,
      defaultSetting.paymentRate,
    ),
    cardRate: readNumber(savedSetting.cardRate, defaultSetting.cardRate),
    deliveryFeePerOrder: readNumber(
      savedSetting.deliveryFeePerOrder,
      defaultSetting.deliveryFeePerOrder,
    ),
    usesOrderCount:
      typeof savedSetting.usesOrderCount === "boolean"
        ? savedSetting.usesOrderCount
        : defaultSetting.usesOrderCount,
    vatRate: readNumber(savedSetting.vatRate, defaultSetting.vatRate),
    vatTargets: readVatTargets(
      savedSetting.vatTargets,
      defaultSetting.vatTargets,
    ),
  };
}

function mergeBusinessFeeSettings(
  savedValue: unknown,
): BusinessFeeSettings {
  if (!isRecord(savedValue)) {
    return DEFAULT_SETTLEMENT_SETTINGS;
  }

  if (savedValue.version !== SETTLEMENT_SETTINGS_VERSION) {
    return DEFAULT_SETTLEMENT_SETTINGS;
  }

  const savedChannels = savedValue.channels;

  if (!isRecord(savedChannels)) {
    return DEFAULT_SETTLEMENT_SETTINGS;
  }

  const channels = Object.fromEntries(
    CHANNEL_IDS.map((channelId) => [
      channelId,
      mergeChannelSetting(
        DEFAULT_SETTLEMENT_SETTINGS.channels[channelId],
        savedChannels[channelId],
      ),
    ]),
  ) as Record<SettlementChannelId, SettlementChannelSetting>;

  return {
    version: SETTLEMENT_SETTINGS_VERSION,
    channels,
  };
}

function getLocalStorage() {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
}

export function getBusinessFeeSettings(): BusinessFeeSettings {
  const storage = getLocalStorage();

  if (!storage) {
    return DEFAULT_SETTLEMENT_SETTINGS;
  }

  try {
    const savedValue = storage.getItem(BUSINESS_FEE_SETTINGS_STORAGE_KEY);

    if (!savedValue) {
      return DEFAULT_SETTLEMENT_SETTINGS;
    }

    return mergeBusinessFeeSettings(JSON.parse(savedValue) as unknown);
  } catch {
    return DEFAULT_SETTLEMENT_SETTINGS;
  }
}

export function saveBusinessFeeSettings(
  settings: BusinessFeeSettings,
): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      BUSINESS_FEE_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
    return true;
  } catch {
    return false;
  }
}

export function updateChannelSetting(
  channelId: SettlementChannelId,
  update: ChannelSettingUpdate,
): BusinessFeeSettings {
  const currentSettings = getBusinessFeeSettings();
  const currentChannel = currentSettings.channels[channelId];

  const nextSettings: BusinessFeeSettings = {
    ...currentSettings,
    channels: {
      ...currentSettings.channels,
      [channelId]: {
        ...currentChannel,
        ...update,
        channelId: currentChannel.channelId,
        platformId: currentChannel.platformId,
      },
    },
  };

  saveBusinessFeeSettings(nextSettings);
  return nextSettings;
}

export function resetBusinessFeeSettings(): BusinessFeeSettings {
  saveBusinessFeeSettings(DEFAULT_SETTLEMENT_SETTINGS);
  return DEFAULT_SETTLEMENT_SETTINGS;
}

export function getChannelSetting(
  channelId: SettlementChannelId,
): SettlementChannelSetting {
  return getBusinessFeeSettings().channels[channelId];
}
