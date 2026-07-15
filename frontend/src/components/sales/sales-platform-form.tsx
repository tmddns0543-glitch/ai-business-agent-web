"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import MoneyField from "@/components/sales/money-field";
import type {
  SalesFormValues,
  SalesPlatformConfig,
} from "@/types/sales-platform";

type SalesPlatformFormProps = {
  config: SalesPlatformConfig;
  businessDay?: string;
};

function createEmptyValues(config: SalesPlatformConfig): SalesFormValues {
  return Object.fromEntries(
    config.fields.map((field) => [field.key, 0]),
  );
}

export default function SalesPlatformForm({
  config,
  businessDay = "2026년 7월 12일",
}: SalesPlatformFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<SalesFormValues>(() =>
    createEmptyValues(config),
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(config.storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SalesFormValues;

        setValues({
          ...createEmptyValues(config),
          ...parsed,
        });
      } catch {
        window.localStorage.removeItem(config.storageKey);
      }
    }

    setIsLoaded(true);
  }, [config]);

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

  function saveValues() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    window.localStorage.setItem(
      config.storageKey,
      JSON.stringify(values),
    );

    window.setTimeout(() => {
      router.push("/closing/sales");
    }, 300);
  }

  function resetValues() {
    const confirmed = window.confirm(
      `${config.title} 입력값을 모두 0원으로 초기화할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setValues(createEmptyValues(config));
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
            {businessDay}
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
            disabled={isSaving}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-4 text-base font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </button>

          <button
            type="button"
            onClick={resetValues}
            disabled={isSaving}
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