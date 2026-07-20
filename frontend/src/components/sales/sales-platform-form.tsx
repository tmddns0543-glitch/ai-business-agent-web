"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import MoneyField from "@/components/sales/money-field";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { setSectionUnconfirmed } from "@/lib/storage/closing-status-by-business-day-storage";
import { getSalesRepository } from "@/repositories/sales/get-sales-repository";
import {
  formatBusinessDate,
  type BusinessDate,
} from "@/types/business-day";
import type {
  SalesFormValues,
  SalesPlatformConfig,
} from "@/types/sales-platform";

type SalesPlatformFormProps = {
  config: SalesPlatformConfig;
};

function createFormValues(
  config: SalesPlatformConfig,
  saved: Readonly<Record<string, unknown>> = {},
): SalesFormValues {
  return Object.fromEntries(
    config.fields.map((field) => {
      const savedValue = saved[field.key];

      return [
        field.key,
        typeof savedValue === "number" &&
        Number.isFinite(savedValue) &&
        savedValue >= 0
          ? savedValue
          : 0,
      ];
    }),
  );
}

export default function SalesPlatformForm({ config }: SalesPlatformFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<SalesFormValues>(() =>
    createFormValues(config),
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    let active = true;
    const selectedBusinessDate = getSelectedBusinessDate();
    setBusinessDate(selectedBusinessDate);
    getSalesRepository().getPlatformSnapshot(selectedBusinessDate, config.platformKey)
      .then((saved) => {
        if (!active) return;
        setValues(createFormValues(config, saved));
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "매출을 불러오지 못했습니다.");
        setIsLoaded(true);
      });
    return () => { active = false; };
  }, [config]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalSales = useMemo(() => {
    return config.fields
      .filter((field) => field.type === "money")
      .reduce((total, field) => {
        return total + (values[field.key] ?? 0);
      }, 0);
  }, [config.fields, values]);

  function updateValue(fieldKey: string, value: number) {
    setValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  async function saveValues() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    if (!businessDate) {
      setIsSaving(false);
      window.alert("매출을 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    let savedValues: SalesFormValues;
    try {
      savedValues = createFormValues(config, await getSalesRepository().getPlatformSnapshot(businessDate, config.platformKey));
    } catch (error) {
      setIsSaving(false);
      window.alert(error instanceof Error ? error.message : "매출을 불러오지 못했습니다.");
      return;
    }
    const hasChanges = config.fields.some(
      ({ key }) => savedValues[key] !== (values[key] ?? 0),
    );

    if (!hasChanges) {
      router.push("/closing/sales");
      return;
    }

    try {
      await getSalesRepository().savePlatformSnapshot(businessDate, config.platformKey, values);
    } catch (error) {
      setIsSaving(false);
      window.alert(error instanceof Error ? error.message : "매출을 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    if (!setSectionUnconfirmed(businessDate, "sales")) {
      setIsSaving(false);
      window.alert("매출 확인 상태를 변경하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    router.push("/closing/sales");
  }

  function resetValues() {
    const confirmed = window.confirm(
      `${config.title} 입력값을 모두 0원으로 초기화할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setValues(createFormValues(config));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-28 pt-6 shadow-sm">
        <header>
          <Link
            href="/closing/sales"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="매출 플랫폼 목록으로 돌아가기"
          >
            ‹
          </Link>

          <p className="mt-5 text-sm font-medium text-slate-500">
            {businessDate
              ? `${formatBusinessDate(businessDate)} 영업일에 저장됩니다.`
              : "영업일을 불러오는 중입니다."}
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            {config.title}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {config.description}
          </p>
        </header>

        <section className="mt-7 rounded-3xl bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-500">
            {config.title} 총매출
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-indigo-700">
            {isLoaded
              ? `${totalSales.toLocaleString("ko-KR")}원`
              : "불러오는 중"}
          </p>
        </section>

        {loadError && (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</p>
        )}

        <section className="mt-6 space-y-3">
          {config.fields.map((field) => (
            <MoneyField
              key={field.key}
              label={field.label}
              description={field.description}
              value={values[field.key] ?? 0}
              unit={field.type === "money" ? "원" : "건"}
              onChange={(value) => updateValue(field.key, value)}
            />
          ))}
        </section>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            onClick={saveValues}
            disabled={isSaving || !isLoaded || Boolean(loadError)}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-4 text-base font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </button>

          <button
            type="button"
            onClick={resetValues}
            disabled={isSaving || !isLoaded || Boolean(loadError)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            입력값 초기화
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          저장하면 매출 플랫폼 목록으로 돌아갑니다.
        </p>
      </div>
    </main>
  );
}
