import { DEFAULT_SETTLEMENT_SETTINGS } from "@/data/settlement-default-settings";
import type {
  BusinessFeeSettings,
  PlatformFeeSettings,
  SettlementChannelId,
  SettlementChannelSetting,
  SettlementPlatformId,
} from "@/types/settlement";
import { getPlatformFeeSettings } from "@/lib/storage/fee-settings-storage";

type ChannelSettingUpdate = Partial<
  Omit<SettlementChannelSetting, "channelId" | "platformId">
>;

export function parseSettingNumber(value: string) {
  return value.trim() === "" ? 0 : Number(value);
}

export function validateFeeRate(value: number, max = 100) {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    return max === 1.5
      ? "카드수수료율은 0% 이상 1.5% 이하로 입력해주세요."
      : "0% 이상 100% 이하의 숫자로 입력해주세요.";
  }

  return undefined;
}

export function validatePerOrderFee(value: number) {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return "건당 배달료는 0원 이상의 정수로 입력해주세요.";
  }

  return undefined;
}

export function getDefaultChannelUpdate(channelId: SettlementChannelId) {
  const setting: SettlementChannelSetting =
    DEFAULT_SETTLEMENT_SETTINGS.channels[channelId];
  const { channelId: savedChannelId, platformId, ...update } = setting;

  void savedChannelId;
  void platformId;

  return update;
}

export function createPlatformFeeSettings(
  current: BusinessFeeSettings,
  platformId: SettlementPlatformId,
  updates: Readonly<Partial<Record<SettlementChannelId, ChannelSettingUpdate>>>,
): PlatformFeeSettings {
  const channels = { ...current.channels };
  for (const [rawChannelId, update] of Object.entries(updates)) {
    const channelId = rawChannelId as SettlementChannelId;
    const channel = channels[channelId];
    if (channel.platformId !== platformId || !update) continue;
    channels[channelId] = { ...channel, ...update, channelId, platformId };
  }
  return getPlatformFeeSettings({ ...current, channels }, platformId);
}
