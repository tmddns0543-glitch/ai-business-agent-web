"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ClosingStatus = {
  salesConfirmed: boolean;
  expensesConfirmed: boolean;
  deliveryConfirmed: boolean;
  closingCompleted: boolean;
};

type SalesValues = Record<string, number>;

const INITIAL_STATUS: ClosingStatus = {
  salesConfirmed: false,
  expensesConfirmed: false,
  deliveryConfirmed: false,
  closingCompleted: false,
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function readStorageObject(key: string): SalesValues {
  const saved = window.localStorage.getItem(key);

  if (!saved) {
    return {};
  }

  try {
    return JSON.parse(saved) as SalesValues;
  } catch {
    window.localStorage.removeItem(key);
    return {};
  }
}

function readBoolean(key: string) {
  return window.localStorage.getItem(key) === "true";
}

function calculatePlatformTotal(
  values: SalesValues,
  excludedKeys: string[] = [],
) {
  return Object.entries(values).reduce((total, [key, value]) => {
    if (excludedKeys.includes(key)) {
      return total;
    }

    return total + Number(value ?? 0);
  }, 0);
}

type ClosingItemProps = {
  title: string;
  description: string;
  amount?: string;
  completed: boolean;
  href: string;
  actionLabel: string;
};

function ClosingItem({
  title,
  description,
  amount,
  completed,
  href,
  actionLabel,
}: ClosingItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`block rounded-3xl border p-5 transition active:scale-[0.99] ${
        completed
          ? "border-emerald-100 bg-emerald-50/50"
          : "border-slate-200 bg-white hover:border-indigo-200"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
            completed
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {completed ? "✓" : "·"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{title}</h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                completed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-orange-50 text-orange-600"
              }`}
            >
              {completed ? "완료" : actionLabel}
            </span>
          </div>

          {amount && (
            <p
              className={`mt-3 text-xl font-bold ${
                completed ? "text-emerald-700" : "text-slate-950"
              }`}
            >
              {amount}
            </p>
          )}
        </div>

        <span className="mt-3 shrink-0 text-2xl text-slate-300">›</span>
      </div>
    </Link>
  );
}

export default function ClosingPage() {
  const [status, setStatus] = useState<ClosingStatus>(INITIAL_STATUS);
  const [salesTotal, setSalesTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [deliveryBalance, setDeliveryBalance] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const baemin = readStorageObject("sales-baemin");
    const coupangEats = readStorageObject("sales-coupang-eats");
    const yogiyo = readStorageObject("sales-yogiyo");
    const ddangyo = readStorageObject("sales-ddangyo");
    const general = readStorageObject("sales-general");

    const baeminTotal = calculatePlatformTotal(baemin, [
      "baeminOneOrders",
    ]);

    const coupangTotal = calculatePlatformTotal(coupangEats, ["orders"]);

    const yogiyoTotal = calculatePlatformTotal(yogiyo, [
      "yogiDeliveryOrders",
    ]);

    const ddangyoTotal = calculatePlatformTotal(ddangyo);

    const generalTotal = calculatePlatformTotal(general);

    setSalesTotal(
      baeminTotal +
        coupangTotal +
        yogiyoTotal +
        ddangyoTotal +
        generalTotal,
    );

    const savedExpenseTotal = Number(
      window.localStorage.getItem("closing-expense-total") ?? 0,
    );

    const savedDeliveryBalance = Number(
      window.localStorage.getItem("closing-delivery-balance") ?? 0,
    );

    setExpenseTotal(savedExpenseTotal);
    setDeliveryBalance(savedDeliveryBalance);

    setStatus({
      salesConfirmed: readBoolean("closing-sales-confirmed"),
      expensesConfirmed: readBoolean("closing-expenses-confirmed"),
      deliveryConfirmed: readBoolean("closing-delivery-confirmed"),
      closingCompleted: readBoolean("closing-completed"),
    });

    setIsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const completedCount = useMemo(() => {
    return [
      status.salesConfirmed,
      status.expensesConfirmed,
      status.deliveryConfirmed,
    ].filter(Boolean).length;
  }, [status]);

  const progress = Math.round((completedCount / 3) * 100);

  const allCompleted =
    status.salesConfirmed &&
    status.expensesConfirmed &&
    status.deliveryConfirmed;

  const nextAction = useMemo(() => {
    if (!status.salesConfirmed) {
      return {
        label: "매출부터 확인하기",
        href: "/closing/sales",
      };
    }

    if (!status.expensesConfirmed) {
      return {
        label: "비용 확인하기",
        href: "/closing/expenses",
      };
    }

    if (!status.deliveryConfirmed) {
      return {
        label: "배달대행사 확인하기",
        href: "/closing/delivery",
      };
    }

    return {
      label: "오늘 마감 완료하기",
      href: "",
    };
  }, [status]);

  function completeClosing() {
    if (!allCompleted) {
      return;
    }

    window.localStorage.setItem("closing-completed", "true");

    setStatus((current) => ({
      ...current,
      closingCompleted: true,
    }));
  }

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          마감 내용을 불러오고 있어요.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-32 pt-6 shadow-sm">
        <header>
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="홈으로 돌아가기"
          >
            ‹
          </Link>

          <div className="mt-5 flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                2026년 7월 12일 영업일
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                오늘 마감
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                원하는 항목부터 확인해도 괜찮아요.
              </p>
            </div>

            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    #4f46e5 ${progress}%,
                    #e2e8f0 ${progress}% 100%
                  )`,
                }}
              />

              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <span className="text-sm font-bold text-indigo-600">
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        </header>

        {status.closingCompleted ? (
          <section className="mt-8 rounded-3xl bg-emerald-500 p-6 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
              ✓
            </div>

            <p className="mt-5 text-sm font-medium text-emerald-100">
              오늘 필요한 기록을 모두 확인했어요.
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              오늘 마감 완료
            </h2>

            <p className="mt-3 text-sm leading-6 text-emerald-50">
              오늘도 수고하셨습니다.
            </p>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl bg-indigo-600 p-6 text-white">
            <p className="text-sm font-medium text-indigo-100">
              현재 마감 진행률
            </p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-bold">{progress}%</p>

                <p className="mt-2 text-sm text-indigo-100">
                  총 3개 항목 중 {completedCount}개 완료
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-indigo-200">현재 총매출</p>

                <p className="mt-1 text-xl font-bold">
                  {formatMoney(salesTotal)}
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
        )}

        <section className="mt-6 space-y-3">
          <ClosingItem
            title="매출"
            description="플랫폼별 매출을 입력하고 확인합니다."
            amount={formatMoney(salesTotal)}
            completed={status.salesConfirmed}
            href="/closing/sales"
            actionLabel="확인 필요"
          />

          <ClosingItem
            title="비용"
            description={
              expenseTotal > 0
                ? "입력한 비용 거래를 확인합니다."
                : "오늘 발생한 비용을 확인해주세요."
            }
            amount={
              expenseTotal > 0 ? formatMoney(expenseTotal) : undefined
            }
            completed={status.expensesConfirmed}
            href="/closing/expenses"
            actionLabel="확인 필요"
          />

          <ClosingItem
            title="배달대행사"
            description="오늘 사용액과 캐시입금 내역을 확인합니다."
            amount={
              deliveryBalance !== 0
                ? `예수금 ${formatMoney(deliveryBalance)}`
                : undefined
            }
            completed={status.deliveryConfirmed}
            href="/closing/delivery"
            actionLabel="확인 필요"
          />
        </section>

        <section className="mt-6 rounded-3xl bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              현재 총매출
            </span>

            <span className="text-lg font-bold text-slate-950">
              {formatMoney(salesTotal)}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              입력 비용
            </span>

            <span className="text-lg font-bold text-slate-950">
              {formatMoney(expenseTotal)}
            </span>
          </div>

          <div className="my-5 border-t border-slate-200" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">
              현재 단순 잔액
            </span>

            <span className="text-2xl font-bold text-indigo-600">
              {formatMoney(salesTotal - expenseTotal)}
            </span>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-400">
            현재는 입력된 매출과 비용만 반영합니다. 플랫폼 수수료 계산은
            다음 단계에서 추가됩니다.
          </p>
        </section>

        {!status.closingCompleted &&
          (allCompleted ? (
            <button
              type="button"
              onClick={completeClosing}
              className="mt-6 w-full rounded-2xl bg-indigo-600 px-4 py-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
            >
              오늘 마감 완료하기
            </button>
          ) : (
            <Link
              href={nextAction.href}
              className="mt-6 block w-full rounded-2xl bg-indigo-600 px-4 py-4 text-center text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
            >
              {nextAction.label}
            </Link>
          ))}

        {status.closingCompleted && (
          <Link
            href="/"
            className="mt-6 block w-full rounded-2xl bg-slate-950 px-4 py-4 text-center text-base font-bold text-white"
          >
            홈으로 돌아가기
          </Link>
        )}

        <nav className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-around rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur">
          <Link href="/" className="px-4 py-2 text-sm text-slate-500">
            홈
          </Link>

          <Link
            href="/closing"
            className="px-4 py-2 text-sm font-bold text-indigo-600"
          >
            마감
          </Link>

          <Link
            href="/management"
            className="px-4 py-2 text-sm text-slate-500"
          >
            경영
          </Link>

          <Link
            href="/more"
            className="px-4 py-2 text-sm text-slate-500"
          >
            더보기
          </Link>
        </nav>
      </div>
    </main>
  );
}
