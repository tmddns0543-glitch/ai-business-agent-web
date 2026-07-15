"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  FeeRateField,
  PerOrderFeeField,
  SettingChannelCard,
} from "@/components/settings/fee-setting-fields";
import {
  getDefaultChannelUpdate,
  parseSettingNumber,
  validateFeeRate,
  validatePerOrderFee,
} from "@/components/settings/fee-setting-utils";
import {
  SettingsFormActions,
  SettingsLoading,
  SettingsPageLayout,
} from "@/components/settings/settings-page-parts";
import {
  getBusinessFeeSettings,
  updateChannelSetting,
} from "@/lib/storage/fee-settings-storage";
import { SETTLEMENT_CHANNEL_IDS } from "@/types/settlement";

const CHANNEL_ID = SETTLEMENT_CHANNEL_IDS.COUPANG_EATS_DELIVERY;

type Values = {
  brokerageRate: string;
  paymentRate: string;
  deliveryFeePerOrder: string;
};
type Errors = Partial<Record<keyof Values, string>>;

function readValues(): Values {
  const setting = getBusinessFeeSettings().channels[CHANNEL_ID];
  return {
    brokerageRate: String(setting.brokerageRate),
    paymentRate: String(setting.paymentRate),
    deliveryFeePerOrder: String(setting.deliveryFeePerOrder),
  };
}

export default function CoupangEatsSettingsPage() {
  const [values, setValues] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after mount. */
  useEffect(() => setValues(readValues()), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function change(field: keyof Values, value: string) {
    setValues((current) => current && { ...current, [field]: value });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values) return;

    const normalized = {
      brokerageRate: parseSettingNumber(values.brokerageRate),
      paymentRate: parseSettingNumber(values.paymentRate),
      deliveryFeePerOrder: parseSettingNumber(values.deliveryFeePerOrder),
    };
    const nextErrors: Errors = {
      brokerageRate: validateFeeRate(normalized.brokerageRate),
      paymentRate: validateFeeRate(normalized.paymentRate),
      deliveryFeePerOrder: validatePerOrderFee(
        normalized.deliveryFeePerOrder,
      ),
    };
    const activeErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, error]) => error),
    ) as Errors;
    if (Object.keys(activeErrors).length) {
      setErrors(activeErrors);
      setMessage("입력값을 확인한 뒤 다시 저장해주세요.");
      return;
    }

    updateChannelSetting(CHANNEL_ID, normalized);
    const saved = readValues();
    const didSave = (Object.keys(saved) as (keyof Values)[]).every(
      (field) => Number(saved[field]) === normalized[field],
    );
    if (!didSave) {
      setMessage("설정을 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }
    setValues(saved);
    setErrors({});
    setMessage("쿠팡이츠 설정을 저장했습니다.");
  }

  function restore() {
    if (!window.confirm("쿠팡이츠 설정을 기본값으로 되돌릴까요?")) return;
    updateChannelSetting(CHANNEL_ID, getDefaultChannelUpdate(CHANNEL_ID));
    setValues(readValues());
    setErrors({});
    setMessage("쿠팡이츠 설정을 기본값으로 되돌렸습니다.");
  }

  if (!values) return <SettingsLoading />;

  return (
    <SettingsPageLayout title="쿠팡이츠 설정" description="쿠팡이츠 계약서에 표시된 수수료와 건당 배달료를 입력하세요.">
      <form onSubmit={save} noValidate>
        <SettingChannelCard title="쿠팡이츠 배달">
          <FeeRateField id="coupangBrokerageRate" label="중개수수료율" value={values.brokerageRate} error={errors.brokerageRate} onChange={(value) => change("brokerageRate", value)} />
          <FeeRateField id="coupangPaymentRate" label="결제수수료율" value={values.paymentRate} error={errors.paymentRate} onChange={(value) => change("paymentRate", value)} />
          <PerOrderFeeField id="coupangDeliveryFee" label="건당 배달료" value={values.deliveryFeePerOrder} error={errors.deliveryFeePerOrder} onChange={(value) => change("deliveryFeePerOrder", value)} />
        </SettingChannelCard>
        <SettingsFormActions message={message} onRestore={restore} />
      </form>
    </SettingsPageLayout>
  );
}
