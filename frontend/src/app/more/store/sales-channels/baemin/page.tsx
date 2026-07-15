"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import {
  FeeRateField,
  PerOrderFeeField,
  SettingChannelCard,
} from "@/components/settings/fee-setting-fields";
import { DEFAULT_SETTLEMENT_SETTINGS } from "@/data/settlement-default-settings";
import {
  getBusinessFeeSettings,
  updateChannelSetting,
} from "@/lib/storage/fee-settings-storage";
import {
  SETTLEMENT_CHANNEL_IDS,
  type BusinessFeeSettings,
  type SettlementChannelId,
  type SettlementChannelSetting,
} from "@/types/settlement";

const BAEMIN_CHANNEL_IDS = {
  prepaid: SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_PREPAID,
  card: SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_CARD,
  cash: SETTLEMENT_CHANNEL_IDS.BAEMIN_SHOP_DELIVERY_CASH,
  baeminOne: SETTLEMENT_CHANNEL_IDS.BAEMIN_ONE,
} as const;

type FormValues = {
  prepaidBrokerageRate: string;
  prepaidPaymentRate: string;
  cardBrokerageRate: string;
  cardRate: string;
  cashBrokerageRate: string;
  baeminOneBrokerageRate: string;
  baeminOnePaymentRate: string;
  baeminOneDeliveryFeePerOrder: string;
};

type FormField = keyof FormValues;
type FormErrors = Partial<Record<FormField, string>>;
type FormMessage = { type: "success" | "error"; text: string };

function createFormValues(settings: BusinessFeeSettings): FormValues {
  const prepaid = settings.channels[BAEMIN_CHANNEL_IDS.prepaid];
  const card = settings.channels[BAEMIN_CHANNEL_IDS.card];
  const cash = settings.channels[BAEMIN_CHANNEL_IDS.cash];
  const baeminOne = settings.channels[BAEMIN_CHANNEL_IDS.baeminOne];

  return {
    prepaidBrokerageRate: String(prepaid.brokerageRate),
    prepaidPaymentRate: String(prepaid.paymentRate),
    cardBrokerageRate: String(card.brokerageRate),
    cardRate: String(card.cardRate),
    cashBrokerageRate: String(cash.brokerageRate),
    baeminOneBrokerageRate: String(baeminOne.brokerageRate),
    baeminOnePaymentRate: String(baeminOne.paymentRate),
    baeminOneDeliveryFeePerOrder: String(
      baeminOne.deliveryFeePerOrder,
    ),
  };
}

function parseFieldValue(value: string) {
  return value.trim() === "" ? 0 : Number(value);
}

function validateForm(values: FormValues) {
  const errors: FormErrors = {};
  const normalized = Object.fromEntries(
    Object.entries(values).map(([field, value]) => [
      field,
      parseFieldValue(value),
    ]),
  ) as Record<FormField, number>;

  const percentageFields: readonly FormField[] = [
    "prepaidBrokerageRate",
    "prepaidPaymentRate",
    "cardBrokerageRate",
    "cashBrokerageRate",
    "baeminOneBrokerageRate",
    "baeminOnePaymentRate",
  ];

  for (const field of percentageFields) {
    const value = normalized[field];

    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors[field] = "0% 이상 100% 이하의 숫자로 입력해주세요.";
    }
  }

  if (
    !Number.isFinite(normalized.cardRate) ||
    normalized.cardRate < 0 ||
    normalized.cardRate > 1.5
  ) {
    errors.cardRate =
      "카드수수료율은 0% 이상 1.5% 이하로 입력해주세요.";
  }

  const deliveryFee = normalized.baeminOneDeliveryFeePerOrder;

  if (
    !Number.isFinite(deliveryFee) ||
    deliveryFee < 0 ||
    !Number.isInteger(deliveryFee)
  ) {
    errors.baeminOneDeliveryFeePerOrder =
      "건당 배달료는 0원 이상의 정수로 입력해주세요.";
  }

  return { errors, normalized };
}

function settingsMatchForm(
  settings: BusinessFeeSettings,
  values: Record<FormField, number>,
) {
  const current = createFormValues(settings);

  return (Object.keys(current) as FormField[]).every(
    (field) => Number(current[field]) === values[field],
  );
}

function getDefaultChannelUpdate(channelId: SettlementChannelId) {
  const setting: SettlementChannelSetting =
    DEFAULT_SETTLEMENT_SETTINGS.channels[channelId];
  const { channelId: savedChannelId, platformId, ...update } = setting;

  void savedChannelId;
  void platformId;

  return update;
}

export default function BaeminFeeSettingsPage() {
  const [values, setValues] = useState<FormValues | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<FormMessage | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after the client mounts. */
  useEffect(() => {
    setValues(createFormValues(getBusinessFeeSettings()));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function updateValue(field: FormField, value: string) {
    setValues((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values) {
      return;
    }

    const { errors: nextErrors, normalized } = validateForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage({
        type: "error",
        text: "입력값을 확인한 뒤 다시 저장해주세요.",
      });
      return;
    }

    updateChannelSetting(BAEMIN_CHANNEL_IDS.prepaid, {
      brokerageRate: normalized.prepaidBrokerageRate,
      paymentRate: normalized.prepaidPaymentRate,
    });
    updateChannelSetting(BAEMIN_CHANNEL_IDS.card, {
      brokerageRate: normalized.cardBrokerageRate,
      cardRate: normalized.cardRate,
    });
    updateChannelSetting(BAEMIN_CHANNEL_IDS.cash, {
      brokerageRate: normalized.cashBrokerageRate,
    });
    updateChannelSetting(BAEMIN_CHANNEL_IDS.baeminOne, {
      brokerageRate: normalized.baeminOneBrokerageRate,
      paymentRate: normalized.baeminOnePaymentRate,
      deliveryFeePerOrder: normalized.baeminOneDeliveryFeePerOrder,
    });

    const savedSettings = getBusinessFeeSettings();

    if (!settingsMatchForm(savedSettings, normalized)) {
      setMessage({
        type: "error",
        text: "설정을 저장하지 못했습니다. 다시 시도해주세요.",
      });
      return;
    }

    setValues(createFormValues(savedSettings));
    setErrors({});
    setMessage({
      type: "success",
      text: "배달의민족 설정을 저장했습니다.",
    });
  }

  function restoreDefaults() {
    if (!window.confirm("배달의민족 설정을 기본값으로 되돌릴까요?")) {
      return;
    }

    for (const channelId of Object.values(BAEMIN_CHANNEL_IDS)) {
      updateChannelSetting(channelId, getDefaultChannelUpdate(channelId));
    }

    const restoredSettings = getBusinessFeeSettings();
    setValues(createFormValues(restoredSettings));
    setErrors({});
    setMessage({
      type: "success",
      text: "배달의민족 설정을 기본값으로 되돌렸습니다.",
    });
  }

  if (!values) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          설정을 불러오는 중
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link
            href="/more/store/sales-channels"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="매출채널 설정으로 돌아가기"
          >
            ‹
          </Link>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            배달의민족 설정
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            배달의민족 계약서에 표시된 수수료와 건당 배달료를 입력하세요.
          </p>
        </header>

        <form onSubmit={saveSettings} noValidate className="mt-7">
          <div className="space-y-4">
            <SettingChannelCard title="가게배달 선결제">
                <FeeRateField
                  id="prepaidBrokerageRate"
                  label="중개수수료율"
                  value={values.prepaidBrokerageRate}
                  error={errors.prepaidBrokerageRate}
                  onChange={(value) =>
                    updateValue("prepaidBrokerageRate", value)
                  }
                />
                <FeeRateField
                  id="prepaidPaymentRate"
                  label="결제수수료율"
                  value={values.prepaidPaymentRate}
                  error={errors.prepaidPaymentRate}
                  onChange={(value) =>
                    updateValue("prepaidPaymentRate", value)
                  }
                />
            </SettingChannelCard>

            <SettingChannelCard title="가게배달 카드">
                <FeeRateField
                  id="cardBrokerageRate"
                  label="중개수수료율"
                  value={values.cardBrokerageRate}
                  error={errors.cardBrokerageRate}
                  onChange={(value) =>
                    updateValue("cardBrokerageRate", value)
                  }
                />
                <FeeRateField
                  id="cardRate"
                  label="카드수수료율"
                  value={values.cardRate}
                  max={1.5}
                  error={errors.cardRate}
                  onChange={(value) => updateValue("cardRate", value)}
                />
            </SettingChannelCard>

            <SettingChannelCard title="가게배달 현금">
                <FeeRateField
                  id="cashBrokerageRate"
                  label="중개수수료율"
                  value={values.cashBrokerageRate}
                  error={errors.cashBrokerageRate}
                  onChange={(value) =>
                    updateValue("cashBrokerageRate", value)
                  }
                />
            </SettingChannelCard>

            <SettingChannelCard title="배민원">
                <FeeRateField
                  id="baeminOneBrokerageRate"
                  label="중개수수료율"
                  value={values.baeminOneBrokerageRate}
                  error={errors.baeminOneBrokerageRate}
                  onChange={(value) =>
                    updateValue("baeminOneBrokerageRate", value)
                  }
                />
                <FeeRateField
                  id="baeminOnePaymentRate"
                  label="결제수수료율"
                  value={values.baeminOnePaymentRate}
                  error={errors.baeminOnePaymentRate}
                  onChange={(value) =>
                    updateValue("baeminOnePaymentRate", value)
                  }
                />
                <PerOrderFeeField
                  id="baeminOneDeliveryFeePerOrder"
                  label="건당 배달료"
                  value={values.baeminOneDeliveryFeePerOrder}
                  error={errors.baeminOneDeliveryFeePerOrder}
                  onChange={(value) =>
                    updateValue("baeminOneDeliveryFeePerOrder", value)
                  }
                />
            </SettingChannelCard>
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-400">
            플랫폼 계약과 가게 조건에 따라 실제 수수료가 다를 수 있습니다.
            실제 계약 내용을 확인하고 수정해주세요.
          </p>

          {message && (
            <p
              role="status"
              className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 px-4 py-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
            >
              저장하기
            </button>

            <button
              type="button"
              onClick={restoreDefaults}
              className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              기본값으로 되돌리기
            </button>

            <Link
              href="/closing/sales"
              className="block w-full rounded-2xl px-4 py-3 text-center text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              정산 예상금액 확인하기
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
