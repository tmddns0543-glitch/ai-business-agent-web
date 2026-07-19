import {
  DEFAULT_SETTLEMENT_SETTINGS,
  SETTLEMENT_SETTINGS_VERSION,
} from "@/data/settlement-default-settings";
import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import {
  SETTLEMENT_CHANNEL_IDS,
  type BusinessFeeSettings,
  type BusinessFeeSettingsStorageData,
  type PlatformFeeSettingHistoryEntry,
  type PlatformFeeSettings,
  type ResolvedPlatformFeeSettings,
  type SettlementChannelId,
  type SettlementChannelSetting,
  type SettlementPlatformId,
  type TransactionFeeType,
  type VatTarget,
} from "@/types/settlement";

export const BUSINESS_FEE_SETTINGS_STORAGE_KEY = "business-fee-settings";
export const BUSINESS_FEE_SETTINGS_STORAGE_VERSION = 2;

type ChannelSettingUpdate = Partial<
  Omit<SettlementChannelSetting, "channelId" | "platformId">
>;
type ReadResult =
  | { status: "empty"; data: BusinessFeeSettingsStorageData }
  | { status: "valid" | "legacy"; data: BusinessFeeSettingsStorageData }
  | { status: "invalid"; data: BusinessFeeSettingsStorageData };

const CHANNEL_IDS = Object.values(SETTLEMENT_CHANNEL_IDS);
const PLATFORM_IDS: readonly SettlementPlatformId[] = [
  "baemin", "coupang-eats", "yogiyo", "ddangyo", "general",
];
const TRANSACTION_FEE_TYPES: readonly TransactionFeeType[] = ["payment", "card", "none"];
const VAT_TARGETS: readonly VatTarget[] = ["brokerageFee", "paymentFee", "cardFee", "deliveryFee"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransactionFeeType(value: unknown): value is TransactionFeeType {
  return typeof value === "string" && TRANSACTION_FEE_TYPES.includes(value as TransactionFeeType);
}

function isVatTarget(value: unknown): value is VatTarget {
  return typeof value === "string" && VAT_TARGETS.includes(value as VatTarget);
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseChannelSetting(
  defaultSetting: SettlementChannelSetting,
  savedSetting: unknown,
): SettlementChannelSetting | null {
  if (!isRecord(savedSetting)) return null;
  if (
    savedSetting.channelId !== defaultSetting.channelId ||
    savedSetting.platformId !== defaultSetting.platformId ||
    typeof savedSetting.label !== "string" ||
    typeof savedSetting.enabled !== "boolean" ||
    !isTransactionFeeType(savedSetting.transactionFeeType) ||
    typeof savedSetting.usesOrderCount !== "boolean" ||
    !Array.isArray(savedSetting.vatTargets) ||
    !savedSetting.vatTargets.every(isVatTarget)
  ) return null;

  const numberFields = ["brokerageRate", "paymentRate", "cardRate", "deliveryFeePerOrder", "vatRate"] as const;
  if (numberFields.some((field) => typeof savedSetting[field] !== "number" || !Number.isFinite(savedSetting[field]))) return null;

  return {
    channelId: defaultSetting.channelId,
    platformId: defaultSetting.platformId,
    label: savedSetting.label,
    enabled: savedSetting.enabled,
    brokerageRate: readNumber(savedSetting.brokerageRate, defaultSetting.brokerageRate),
    transactionFeeType: savedSetting.transactionFeeType,
    paymentRate: readNumber(savedSetting.paymentRate, defaultSetting.paymentRate),
    cardRate: readNumber(savedSetting.cardRate, defaultSetting.cardRate),
    deliveryFeePerOrder: readNumber(savedSetting.deliveryFeePerOrder, defaultSetting.deliveryFeePerOrder),
    usesOrderCount: savedSetting.usesOrderCount,
    vatRate: readNumber(savedSetting.vatRate, defaultSetting.vatRate),
    vatTargets: savedSetting.vatTargets,
  };
}

function parseBusinessFeeSettings(value: unknown): BusinessFeeSettings | null {
  if (!isRecord(value) || value.version !== SETTLEMENT_SETTINGS_VERSION || !isRecord(value.channels)) return null;
  const channels = {} as Record<SettlementChannelId, SettlementChannelSetting>;
  for (const channelId of CHANNEL_IDS) {
    const parsed = parseChannelSetting(DEFAULT_SETTLEMENT_SETTINGS.channels[channelId], value.channels[channelId]);
    if (!parsed) return null;
    channels[channelId] = parsed;
  }
  return { version: SETTLEMENT_SETTINGS_VERSION, channels };
}

function mergeLegacyChannelSetting(
  defaultSetting: SettlementChannelSetting,
  savedSetting: unknown,
): SettlementChannelSetting {
  if (!isRecord(savedSetting)) return defaultSetting;
  return {
    channelId: defaultSetting.channelId,
    platformId: defaultSetting.platformId,
    label: typeof savedSetting.label === "string" ? savedSetting.label : defaultSetting.label,
    enabled: typeof savedSetting.enabled === "boolean" ? savedSetting.enabled : defaultSetting.enabled,
    brokerageRate: readNumber(savedSetting.brokerageRate, defaultSetting.brokerageRate),
    transactionFeeType: isTransactionFeeType(savedSetting.transactionFeeType) ? savedSetting.transactionFeeType : defaultSetting.transactionFeeType,
    paymentRate: readNumber(savedSetting.paymentRate, defaultSetting.paymentRate),
    cardRate: readNumber(savedSetting.cardRate, defaultSetting.cardRate),
    deliveryFeePerOrder: readNumber(savedSetting.deliveryFeePerOrder, defaultSetting.deliveryFeePerOrder),
    usesOrderCount: typeof savedSetting.usesOrderCount === "boolean" ? savedSetting.usesOrderCount : defaultSetting.usesOrderCount,
    vatRate: readNumber(savedSetting.vatRate, defaultSetting.vatRate),
    vatTargets: Array.isArray(savedSetting.vatTargets) && savedSetting.vatTargets.every(isVatTarget) ? savedSetting.vatTargets : defaultSetting.vatTargets,
  };
}

function parseLegacyBusinessFeeSettings(value: unknown): BusinessFeeSettings | null {
  if (!isRecord(value) || value.version !== SETTLEMENT_SETTINGS_VERSION || !isRecord(value.channels)) return null;
  const savedChannels = value.channels;
  const channels = Object.fromEntries(CHANNEL_IDS.map((channelId) => [
    channelId,
    mergeLegacyChannelSetting(DEFAULT_SETTLEMENT_SETTINGS.channels[channelId], savedChannels[channelId]),
  ])) as Record<SettlementChannelId, SettlementChannelSetting>;
  return { version: SETTLEMENT_SETTINGS_VERSION, channels };
}

function emptyHistory(): Record<SettlementPlatformId, readonly PlatformFeeSettingHistoryEntry[]> {
  return { baemin: [], "coupang-eats": [], yogiyo: [], ddangyo: [], general: [] };
}

function createDefaultStorage(): BusinessFeeSettingsStorageData {
  return { version: 2, legacySettings: DEFAULT_SETTLEMENT_SETTINGS, history: emptyHistory() };
}

function parsePlatformSettings(value: unknown, platformId: SettlementPlatformId): PlatformFeeSettings | null {
  if (!isRecord(value)) return null;
  const settings: Partial<Record<SettlementChannelId, SettlementChannelSetting>> = {};
  const expectedIds = CHANNEL_IDS.filter((id) => DEFAULT_SETTLEMENT_SETTINGS.channels[id].platformId === platformId);
  for (const channelId of expectedIds) {
    const parsed = parseChannelSetting(DEFAULT_SETTLEMENT_SETTINGS.channels[channelId], value[channelId]);
    if (!parsed) return null;
    settings[channelId] = parsed;
  }
  return settings;
}

function parseHistory(value: unknown) {
  if (!isRecord(value)) return null;
  const history = emptyHistory();
  for (const platformId of PLATFORM_IDS) {
    const entries = value[platformId];
    if (!Array.isArray(entries)) return null;
    const parsedEntries: PlatformFeeSettingHistoryEntry[] = [];
    for (const entry of entries) {
      if (!isRecord(entry) || !isValidBusinessDate(entry.effectiveFrom) || typeof entry.createdAt !== "string") return null;
      const settings = parsePlatformSettings(entry.settings, platformId);
      if (!settings) return null;
      parsedEntries.push({ effectiveFrom: entry.effectiveFrom, settings, createdAt: entry.createdAt });
    }
    history[platformId] = parsedEntries.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  }
  return history;
}

function parseStorage(value: unknown): ReadResult {
  const fallback = createDefaultStorage();
  const legacy = parseLegacyBusinessFeeSettings(value);
  if (legacy) return { status: "legacy", data: { ...fallback, legacySettings: legacy } };
  if (!isRecord(value) || value.version !== BUSINESS_FEE_SETTINGS_STORAGE_VERSION) return { status: "invalid", data: fallback };
  const legacySettings = parseBusinessFeeSettings(value.legacySettings);
  const history = parseHistory(value.history);
  if (!legacySettings || !history) return { status: "invalid", data: fallback };
  return { status: "valid", data: { version: 2, legacySettings, history } };
}

function getStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

function readStorage(): ReadResult {
  const storage = getStorage();
  if (!storage) return { status: "empty", data: createDefaultStorage() };
  const raw = storage.getItem(BUSINESS_FEE_SETTINGS_STORAGE_KEY);
  if (raw === null) return { status: "empty", data: createDefaultStorage() };
  try { return parseStorage(JSON.parse(raw) as unknown); } catch { return { status: "invalid", data: createDefaultStorage() }; }
}

function writeStorage(data: BusinessFeeSettingsStorageData): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const previous = storage.getItem(BUSINESS_FEE_SETTINGS_STORAGE_KEY);
  try {
    const serialized = JSON.stringify(data);
    storage.setItem(BUSINESS_FEE_SETTINGS_STORAGE_KEY, serialized);
    if (storage.getItem(BUSINESS_FEE_SETTINGS_STORAGE_KEY) !== serialized) throw new Error("verification failed");
    return true;
  } catch {
    try {
      if (previous === null) storage.removeItem(BUSINESS_FEE_SETTINGS_STORAGE_KEY);
      else storage.setItem(BUSINESS_FEE_SETTINGS_STORAGE_KEY, previous);
    } catch { return false; }
    return false;
  }
}

export function hasStoredBusinessFeeSettings() {
  const result = readStorage();
  return result.status === "valid" || result.status === "legacy";
}

export function getBusinessFeeSettingsStorage(): BusinessFeeSettingsStorageData {
  return readStorage().data;
}

export function getPlatformFeeSettings(settings: BusinessFeeSettings, platformId: SettlementPlatformId): PlatformFeeSettings {
  return Object.fromEntries(Object.entries(settings.channels).filter(([, channel]) => channel.platformId === platformId)) as PlatformFeeSettings;
}

export function resolvePlatformFeeSettings(platformId: SettlementPlatformId, businessDate: BusinessDate): ResolvedPlatformFeeSettings {
  const result = readStorage();
  const legacySettings = getPlatformFeeSettings(result.data.legacySettings, platformId);
  if (!isValidBusinessDate(businessDate)) return { settings: legacySettings, source: result.status === "empty" || result.status === "invalid" ? "default" : "legacy", effectiveFrom: null };
  const entry = [...result.data.history[platformId]].reverse().find((item) => item.effectiveFrom <= businessDate);
  return entry
    ? { settings: entry.settings, source: "history", effectiveFrom: entry.effectiveFrom }
    : { settings: legacySettings, source: result.status === "empty" || result.status === "invalid" ? "default" : "legacy", effectiveFrom: null };
}

export function resolveBusinessFeeSettingsForBusinessDate(businessDate: BusinessDate): BusinessFeeSettings {
  const channels = { ...DEFAULT_SETTLEMENT_SETTINGS.channels } as Record<SettlementChannelId, SettlementChannelSetting>;
  for (const platformId of PLATFORM_IDS) Object.assign(channels, resolvePlatformFeeSettings(platformId, businessDate).settings);
  return { version: SETTLEMENT_SETTINGS_VERSION, channels };
}

export function getBusinessFeeSettings(): BusinessFeeSettings {
  const data = readStorage().data;
  const channels = { ...data.legacySettings.channels } as Record<SettlementChannelId, SettlementChannelSetting>;
  for (const platformId of PLATFORM_IDS) {
    const latest = data.history[platformId].reduce<PlatformFeeSettingHistoryEntry | undefined>(
      (selected, entry) => !selected || entry.createdAt > selected.createdAt ? entry : selected,
      undefined,
    );
    if (latest) Object.assign(channels, latest.settings);
  }
  return { version: SETTLEMENT_SETTINGS_VERSION, channels };
}

export function saveBusinessFeeSettings(settings: BusinessFeeSettings): boolean {
  const result = readStorage();
  if (result.status === "invalid") return false;
  return writeStorage({ ...result.data, legacySettings: settings });
}

export function savePlatformFeeSettings(
  platformId: SettlementPlatformId,
  settings: PlatformFeeSettings,
  effectiveFrom?: BusinessDate,
): boolean {
  const result = readStorage();
  if (result.status === "invalid") return false;
  const parsed = parsePlatformSettings(settings, platformId);
  if (!parsed) return false;
  if (!effectiveFrom) {
    if (result.status !== "empty") return false;
    return writeStorage({ ...result.data, legacySettings: { ...result.data.legacySettings, channels: { ...result.data.legacySettings.channels, ...parsed } } });
  }
  if (!isValidBusinessDate(effectiveFrom)) return false;
  const entry: PlatformFeeSettingHistoryEntry = { effectiveFrom, settings: parsed, createdAt: new Date().toISOString() };
  const history = [...result.data.history[platformId].filter((item) => item.effectiveFrom !== effectiveFrom), entry]
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return writeStorage({ ...result.data, history: { ...result.data.history, [platformId]: history } });
}

export function updateChannelSetting(channelId: SettlementChannelId, update: ChannelSettingUpdate): BusinessFeeSettings {
  const current = getBusinessFeeSettings();
  const channel = current.channels[channelId];
  const next = { ...current, channels: { ...current.channels, [channelId]: { ...channel, ...update, channelId, platformId: channel.platformId } } };
  saveBusinessFeeSettings(next);
  return next;
}

export function resetBusinessFeeSettings(): BusinessFeeSettings {
  saveBusinessFeeSettings(DEFAULT_SETTLEMENT_SETTINGS);
  return DEFAULT_SETTLEMENT_SETTINGS;
}

export function getChannelSetting(channelId: SettlementChannelId): SettlementChannelSetting {
  return getBusinessFeeSettings().channels[channelId];
}
