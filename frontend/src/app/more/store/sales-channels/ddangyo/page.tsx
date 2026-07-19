"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FeeRateField, SettingChannelCard } from "@/components/settings/fee-setting-fields";
import { createPlatformFeeSettings, getDefaultChannelUpdate, parseSettingNumber, validateFeeRate } from "@/components/settings/fee-setting-utils";
import { useFeeSettingSaveFlow } from "@/components/settings/fee-setting-save-flow";
import { SettingsFormActions, SettingsLoading, SettingsPageLayout } from "@/components/settings/settings-page-parts";
import { getBusinessFeeSettings } from "@/lib/storage/fee-settings-storage";
import { SETTLEMENT_CHANNEL_IDS } from "@/types/settlement";

const CHANNEL_ID = SETTLEMENT_CHANNEL_IDS.DDANGYO_SHOP_DELIVERY_PREPAID;
type Values = { brokerageRate: string; paymentRate: string };
type Errors = Partial<Record<keyof Values, string>>;

function readValues(): Values {
  const setting = getBusinessFeeSettings().channels[CHANNEL_ID];
  return { brokerageRate: String(setting.brokerageRate), paymentRate: String(setting.paymentRate) };
}

export default function DdangyoSettingsPage() {
  const [values, setValues] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const saveFlow = useFeeSettingSaveFlow({ platformId: "ddangyo", onMessage: setMessage, onSaved: () => { setValues(readValues()); setErrors({}); setMessage("땡겨요 설정을 저장했습니다."); } });
  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after mount. */
  useEffect(() => setValues(readValues()), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function change(field: keyof Values, value: string) {
    setValues((current) => current && { ...current, [field]: value });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!values) return;
    const normalized = { brokerageRate: parseSettingNumber(values.brokerageRate), paymentRate: parseSettingNumber(values.paymentRate) };
    const nextErrors: Errors = { brokerageRate: validateFeeRate(normalized.brokerageRate), paymentRate: validateFeeRate(normalized.paymentRate) };
    const active = Object.fromEntries(Object.entries(nextErrors).filter(([, error]) => error)) as Errors;
    if (Object.keys(active).length) { setErrors(active); setMessage("입력값을 확인한 뒤 다시 저장해주세요."); return; }
    saveFlow.requestSave(createPlatformFeeSettings(getBusinessFeeSettings(), "ddangyo", { [CHANNEL_ID]: normalized }));
  }

  function restore() {
    if (!window.confirm("땡겨요 설정을 기본값으로 되돌릴까요?")) return;
    saveFlow.requestSave(createPlatformFeeSettings(getBusinessFeeSettings(), "ddangyo", { [CHANNEL_ID]: getDefaultChannelUpdate(CHANNEL_ID) }));
  }

  if (!values) return <SettingsLoading />;
  return <SettingsPageLayout title="땡겨요 설정" description="땡겨요 계약서에 표시된 수수료를 입력하세요."><form onSubmit={save} noValidate><SettingChannelCard title="가게배달 선결제"><FeeRateField id="ddangyoBrokerageRate" label="중개수수료율" value={values.brokerageRate} error={errors.brokerageRate} onChange={(value) => change("brokerageRate", value)} /><FeeRateField id="ddangyoPaymentRate" label="결제수수료율" value={values.paymentRate} error={errors.paymentRate} onChange={(value) => change("paymentRate", value)} /></SettingChannelCard>{saveFlow.status}<SettingsFormActions message={message} onRestore={restore} /></form>{saveFlow.dialogs}</SettingsPageLayout>;
}
