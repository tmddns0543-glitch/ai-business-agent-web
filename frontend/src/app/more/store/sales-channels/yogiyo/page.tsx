"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FeeRateField, PerOrderFeeField, SettingChannelCard } from "@/components/settings/fee-setting-fields";
import { getDefaultChannelUpdate, parseSettingNumber, validateFeeRate, validatePerOrderFee } from "@/components/settings/fee-setting-utils";
import { SettingsFormActions, SettingsLoading, SettingsPageLayout } from "@/components/settings/settings-page-parts";
import { getBusinessFeeSettings, updateChannelSetting } from "@/lib/storage/fee-settings-storage";
import { SETTLEMENT_CHANNEL_IDS, type BusinessFeeSettings } from "@/types/settlement";

const CHANNEL_IDS = {
  prepaid: SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_PREPAID,
  card: SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_CARD,
  cash: SETTLEMENT_CHANNEL_IDS.YOGIYO_SHOP_DELIVERY_CASH,
  delivery: SETTLEMENT_CHANNEL_IDS.YOGIYO_DELIVERY,
} as const;

type Values = {
  prepaidBrokerageRate: string; prepaidPaymentRate: string;
  cardBrokerageRate: string; cardRate: string; cashBrokerageRate: string;
  deliveryBrokerageRate: string; deliveryPaymentRate: string; deliveryFeePerOrder: string;
};
type Field = keyof Values;
type Errors = Partial<Record<Field, string>>;

function createValues(settings: BusinessFeeSettings): Values {
  const prepaid = settings.channels[CHANNEL_IDS.prepaid]; const card = settings.channels[CHANNEL_IDS.card];
  const cash = settings.channels[CHANNEL_IDS.cash]; const delivery = settings.channels[CHANNEL_IDS.delivery];
  return { prepaidBrokerageRate: String(prepaid.brokerageRate), prepaidPaymentRate: String(prepaid.paymentRate), cardBrokerageRate: String(card.brokerageRate), cardRate: String(card.cardRate), cashBrokerageRate: String(cash.brokerageRate), deliveryBrokerageRate: String(delivery.brokerageRate), deliveryPaymentRate: String(delivery.paymentRate), deliveryFeePerOrder: String(delivery.deliveryFeePerOrder) };
}

function readValues() { return createValues(getBusinessFeeSettings()); }

export default function YogiyoSettingsPage() {
  const [values, setValues] = useState<Values | null>(null); const [errors, setErrors] = useState<Errors>({}); const [message, setMessage] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after mount. */
  useEffect(() => setValues(readValues()), []);
  /* eslint-enable react-hooks/set-state-in-effect */
  function change(field: Field, value: string) { setValues((current) => current && { ...current, [field]: value }); setErrors((current) => ({ ...current, [field]: undefined })); setMessage(""); }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!values) return;
    const normalized = Object.fromEntries(Object.entries(values).map(([field, value]) => [field, parseSettingNumber(value)])) as Record<Field, number>;
    const rateFields: readonly Field[] = ["prepaidBrokerageRate", "prepaidPaymentRate", "cardBrokerageRate", "cashBrokerageRate", "deliveryBrokerageRate", "deliveryPaymentRate"];
    const nextErrors: Errors = {}; for (const field of rateFields) nextErrors[field] = validateFeeRate(normalized[field]);
    nextErrors.cardRate = validateFeeRate(normalized.cardRate, 1.5); nextErrors.deliveryFeePerOrder = validatePerOrderFee(normalized.deliveryFeePerOrder);
    const active = Object.fromEntries(Object.entries(nextErrors).filter(([, error]) => error)) as Errors;
    if (Object.keys(active).length) { setErrors(active); setMessage("입력값을 확인한 뒤 다시 저장해주세요."); return; }
    updateChannelSetting(CHANNEL_IDS.prepaid, { brokerageRate: normalized.prepaidBrokerageRate, paymentRate: normalized.prepaidPaymentRate });
    updateChannelSetting(CHANNEL_IDS.card, { brokerageRate: normalized.cardBrokerageRate, cardRate: normalized.cardRate });
    updateChannelSetting(CHANNEL_IDS.cash, { brokerageRate: normalized.cashBrokerageRate });
    updateChannelSetting(CHANNEL_IDS.delivery, { brokerageRate: normalized.deliveryBrokerageRate, paymentRate: normalized.deliveryPaymentRate, deliveryFeePerOrder: normalized.deliveryFeePerOrder });
    const saved = readValues(); const didSave = (Object.keys(saved) as Field[]).every((field) => Number(saved[field]) === normalized[field]);
    if (!didSave) { setMessage("설정을 저장하지 못했습니다. 다시 시도해주세요."); return; }
    setValues(saved); setErrors({}); setMessage("요기요 설정을 저장했습니다.");
  }

  function restore() {
    if (!window.confirm("요기요 설정을 기본값으로 되돌릴까요?")) return;
    for (const channelId of Object.values(CHANNEL_IDS)) updateChannelSetting(channelId, getDefaultChannelUpdate(channelId));
    setValues(readValues()); setErrors({}); setMessage("요기요 설정을 기본값으로 되돌렸습니다.");
  }
  if (!values) return <SettingsLoading />;
  return <SettingsPageLayout title="요기요 설정" description="요기요 계약서에 표시된 수수료와 건당 배달료를 입력하세요."><form onSubmit={save} noValidate><div className="space-y-4">
    <SettingChannelCard title="가게배달 선결제"><FeeRateField id="yogiyoPrepaidBrokerage" label="중개수수료율" value={values.prepaidBrokerageRate} error={errors.prepaidBrokerageRate} onChange={(v) => change("prepaidBrokerageRate", v)} /><FeeRateField id="yogiyoPrepaidPayment" label="결제수수료율" value={values.prepaidPaymentRate} error={errors.prepaidPaymentRate} onChange={(v) => change("prepaidPaymentRate", v)} /></SettingChannelCard>
    <SettingChannelCard title="가게배달 카드"><FeeRateField id="yogiyoCardBrokerage" label="중개수수료율" value={values.cardBrokerageRate} error={errors.cardBrokerageRate} onChange={(v) => change("cardBrokerageRate", v)} /><FeeRateField id="yogiyoCardRate" label="카드수수료율" value={values.cardRate} max={1.5} error={errors.cardRate} onChange={(v) => change("cardRate", v)} /></SettingChannelCard>
    <SettingChannelCard title="가게배달 현금"><FeeRateField id="yogiyoCashBrokerage" label="중개수수료율" value={values.cashBrokerageRate} error={errors.cashBrokerageRate} onChange={(v) => change("cashBrokerageRate", v)} /></SettingChannelCard>
    <SettingChannelCard title="요기배달"><FeeRateField id="yogiyoDeliveryBrokerage" label="중개수수료율" value={values.deliveryBrokerageRate} error={errors.deliveryBrokerageRate} onChange={(v) => change("deliveryBrokerageRate", v)} /><FeeRateField id="yogiyoDeliveryPayment" label="결제수수료율" value={values.deliveryPaymentRate} error={errors.deliveryPaymentRate} onChange={(v) => change("deliveryPaymentRate", v)} /><PerOrderFeeField id="yogiyoDeliveryFee" label="건당 배달료" value={values.deliveryFeePerOrder} error={errors.deliveryFeePerOrder} onChange={(v) => change("deliveryFeePerOrder", v)} /></SettingChannelCard>
  </div><SettingsFormActions message={message} onRestore={restore} /></form></SettingsPageLayout>;
}
