"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createDeliveryAgencyId } from "@/lib/delivery-agency/create-delivery-agency-id";
import {
  addDeliveryAgency,
  getDeliveryAgencies,
  updateDeliveryAgency,
} from "@/lib/storage/delivery-agency-storage";
import type {
  DeliveryAgency,
  DeliveryAgencyChargeFeeMode,
} from "@/types/delivery-agency";

type DeliveryAgencySettingFormProps = {
  agency?: DeliveryAgency;
};

function cleanAgencyName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeAgencyName(name: string) {
  return cleanAgencyName(name).toLocaleLowerCase("ko-KR");
}

function parseInitialCashBalance(value: string) {
  const parsed = value.trim() === "" ? 0 : Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DeliveryAgencySettingForm({
  agency,
}: DeliveryAgencySettingFormProps) {
  const router = useRouter();
  const [name, setName] = useState(agency?.name ?? "");
  const [initialCashBalance, setInitialCashBalance] = useState(
    agency ? String(agency.initialCashBalance) : "0",
  );
  const [enabled, setEnabled] = useState(agency?.enabled ?? true);
  const [chargeFeeMode, setChargeFeeMode] =
    useState<DeliveryAgencyChargeFeeMode>(
      agency?.chargeFeeMode ?? "deduct-from-payment",
    );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function saveAgency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const cleanedName = cleanAgencyName(name);

    if (!cleanedName) {
      setError("대행사명을 입력해주세요.");
      return;
    }

    if (cleanedName.length > 40) {
      setError("대행사명은 40자 이하로 입력해주세요.");
      return;
    }

    const normalizedName = normalizeAgencyName(cleanedName);
    const duplicate = getDeliveryAgencies().some(
      (candidate) =>
        candidate.id !== agency?.id &&
        normalizeAgencyName(candidate.name) === normalizedName,
    );

    if (duplicate) {
      setError("이미 같은 이름의 배달대행사가 있습니다.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    const balance = parseInitialCashBalance(initialCashBalance);
    const saved = agency
      ? updateDeliveryAgency(agency.id, {
          name: cleanedName,
          initialCashBalance: balance,
          enabled,
          chargeFeeMode,
        })
      : addDeliveryAgency({
          id: createDeliveryAgencyId(),
          name: cleanedName,
          enabled: true,
          initialCashBalance: balance,
          chargeFeeMode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

    if (!saved) {
      setError("배달대행사 설정을 저장하지 못했습니다. 다시 시도해주세요.");
      setIsSaving(false);
      return;
    }

    router.push("/more/store/delivery-agencies");
  }

  return (
    <form onSubmit={saveAgency} noValidate className="mt-7">
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">대행사명</span>
          <input
            type="text"
            value={name}
            maxLength={41}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
              setMessage(null);
            }}
            placeholder="예: 바로고"
            className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">
            초기 캐시 잔액
          </span>
          <div className="mt-1.5 flex min-h-12 items-center rounded-xl border border-slate-200 px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <input
              type="text"
              inputMode="decimal"
              value={initialCashBalance}
              onChange={(event) => {
                setInitialCashBalance(event.target.value);
                setError(null);
                setMessage(null);
              }}
              className="min-w-0 flex-1 bg-transparent py-3 text-right text-base font-bold text-slate-900 outline-none"
            />
            <span className="ml-2 text-sm text-slate-500">원</span>
          </div>
          <span className="mt-1.5 block text-xs leading-5 text-slate-400">
            후불 또는 미납 잔액은 음수로 입력할 수 있습니다.
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-bold text-slate-700">
            충전수수료 방식
          </legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="radio"
                name="chargeFeeMode"
                value="deduct-from-payment"
                checked={chargeFeeMode === "deduct-from-payment"}
                onChange={() => setChargeFeeMode("deduct-from-payment")}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">
                  결제금액에서 차감
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  결제금액에서 수수료를 차감하고 남은 금액이 캐시에 충전됩니다.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="radio"
                name="chargeFeeMode"
                value="additional-payment"
                checked={chargeFeeMode === "additional-payment"}
                onChange={() => setChargeFeeMode("additional-payment")}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">
                  수수료 별도 결제
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  충전금액은 그대로 캐시에 들어가고 수수료가 별도로 결제됩니다.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {agency && (
          <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-slate-200 px-4">
            <span>
              <span className="block text-sm font-bold text-slate-800">
                입력 화면에서 사용
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                사용하지 않아도 과거 거래는 유지됩니다.
              </span>
            </span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-5 w-5"
            />
          </label>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-6 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-wait disabled:bg-indigo-400"
      >
        {isSaving ? "저장 중..." : "저장하기"}
      </button>

      <Link
        href="/more/store/delivery-agencies"
        className="mt-3 block min-h-12 w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
      >
        취소
      </Link>
    </form>
  );
}
