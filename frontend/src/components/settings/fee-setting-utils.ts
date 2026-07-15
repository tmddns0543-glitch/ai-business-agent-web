import { DEFAULT_SETTLEMENT_SETTINGS } from "@/data/settlement-default-settings";
import type {
  SettlementChannelId,
  SettlementChannelSetting,
} from "@/types/settlement";

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
