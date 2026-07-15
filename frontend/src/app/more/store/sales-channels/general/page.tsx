"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FeeRateField, SettingChannelCard } from "@/components/settings/fee-setting-fields";
import { getDefaultChannelUpdate, parseSettingNumber, validateFeeRate } from "@/components/settings/fee-setting-utils";
import { SettingsFormActions, SettingsLoading, SettingsPageLayout } from "@/components/settings/settings-page-parts";
import { getBusinessFeeSettings, updateChannelSetting } from "@/lib/storage/fee-settings-storage";
import { SETTLEMENT_CHANNEL_IDS } from "@/types/settlement";

const CHANNEL_IDS = {
  card: SETTLEMENT_CHANNEL_IDS.GENERAL_CARD,
  cash: SETTLEMENT_CHANNEL_IDS.GENERAL_CASH,
  bankTransfer: SETTLEMENT_CHANNEL_IDS.GENERAL_BANK_TRANSFER,
} as const;

function readCardRate() {
  return String(getBusinessFeeSettings().channels[CHANNEL_IDS.card].cardRate);
}

export default function GeneralSettingsPage() {
  const [cardRate, setCardRate] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after mount. */
  useEffect(() => setCardRate(readCardRate()), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (cardRate === null) return;
    const normalized = parseSettingNumber(cardRate);
    const nextError = validateFeeRate(normalized, 1.5);
    if (nextError) { setError(nextError); setMessage("입력값을 확인한 뒤 다시 저장해주세요."); return; }
    updateChannelSetting(CHANNEL_IDS.card, { cardRate: normalized });
    const saved = readCardRate();
    if (Number(saved) !== normalized) { setMessage("설정을 저장하지 못했습니다. 다시 시도해주세요."); return; }
    setCardRate(saved); setError(undefined); setMessage("일반결제 설정을 저장했습니다.");
  }

  function restore() {
    if (!window.confirm("일반결제 설정을 기본값으로 되돌릴까요?")) return;
    for (const channelId of Object.values(CHANNEL_IDS)) updateChannelSetting(channelId, getDefaultChannelUpdate(channelId));
    setCardRate(readCardRate()); setError(undefined); setMessage("일반결제 설정을 기본값으로 되돌렸습니다.");
  }

  if (cardRate === null) return <SettingsLoading />;
  return <SettingsPageLayout title="일반결제 설정" description="매장에서 직접 결제되는 매출의 공제 기준을 설정하세요."><form onSubmit={save} noValidate><div className="space-y-4"><SettingChannelCard title="카드결제"><FeeRateField id="generalCardRate" label="카드수수료율" value={cardRate} max={1.5} error={error} onChange={(value) => { setCardRate(value); setError(undefined); setMessage(""); }} /></SettingChannelCard><SettingChannelCard title="현금결제" description="현재 기본 공제 항목이 없습니다." /><SettingChannelCard title="계좌이체" description="현재 기본 공제 항목이 없습니다." /></div><SettingsFormActions message={message} onRestore={restore} /></form></SettingsPageLayout>;
}
