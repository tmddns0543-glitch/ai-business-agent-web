"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";

import {
  calculateDeliveryAgencySummariesByAgency,
  calculateTotalDeliveryAgencySummary,
} from "@/lib/delivery-agency/calculate-delivery-agency-summary";
import { calculateDeliveryAgencyBalanceThroughDate } from "@/lib/delivery-agency/calculate-delivery-agency-balance";
import type { SalesSettlementSummary } from "@/lib/settlement/calculate-sales-settlement";
import {
  calculateExpectedSettlementRate,
  formatExpectedSettlementRate,
} from "@/lib/settlement/calculate-settlement-rate";
import { getExpenseSummaryByBusinessDate } from "@/lib/expense/get-expense-summary-from-storage";
import {
  getSalesSettlementByBusinessDate,
} from "@/lib/settlement/get-sales-settlement-from-storage";
import {
  getSelectedBusinessDate,
  setSelectedBusinessDate,
} from "@/lib/storage/business-day-storage";
import {
  completeBusinessDayClosing,
  getClosingStatusByBusinessDate,
  setExpenseConfirmedNone,
  setSectionConfirmed,
} from "@/lib/storage/closing-status-by-business-day-storage";
import {
  getAllDeliveryTransactions,
  getDeliveryAgencies,
  getDeliveryTransactionsByBusinessDate,
} from "@/lib/storage/delivery-agency-storage";
import {
  isValidBusinessDate,
  type BusinessDate,
} from "@/types/business-day";
import type { BusinessDayClosingStatus } from "@/types/closing-status-by-business-day";
import type { ExpenseSummary } from "@/types/expense-storage";
import type { DeliveryAgencySummary } from "@/types/delivery-agency";
import type { SettlementResult } from "@/types/settlement";

function formatMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${safeValue.toLocaleString("ko-KR")}원`;
}

function formatClosingButtonDate(date: BusinessDate) {
  const [, month, day] = date.split("-").map(Number);

  return `${month}월 ${day}일`;
}

function getDeliverySummaryByBusinessDate(
  businessDate: BusinessDate,
): DeliveryAgencySummary {
  const activeAgencies = getDeliveryAgencies().filter(({ enabled }) => enabled);
  const currentTransactions = getDeliveryTransactionsByBusinessDate(businessDate);
  const allTransactions = getAllDeliveryTransactions();
  const summary = calculateTotalDeliveryAgencySummary(
    calculateDeliveryAgencySummariesByAgency(
      currentTransactions,
      activeAgencies,
    ).map(({ summary: agencySummary }) => agencySummary),
  );
  const closingCashBalance = activeAgencies.reduce(
    (total, agency) =>
      total +
      calculateDeliveryAgencyBalanceThroughDate(
        allTransactions,
        agency.id,
        businessDate,
        agency.initialCashBalance,
      ),
    0,
  );

  return {
    ...summary,
    closingCashBalance,
  };
}

type ClosingItemProps = {
  title: string;
  description: string;
  amount?: string;
  amountLabel?: string;
  secondaryAmount?: string;
  secondaryLabel?: string;
  settlement?: SettlementResult;
  completed: boolean;
  completedLabel?: string;
  href: string;
  actionLabel: string;
  details?: ReadonlyArray<{
    label: string;
    value: string;
  }>;
  quickAction?: {
    label: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  };
};

function ClosingItem({
  title,
  description,
  amount,
  amountLabel,
  secondaryAmount,
  secondaryLabel,
  settlement,
  completed,
  completedLabel = "완료",
  href,
  actionLabel,
  details,
  quickAction,
}: ClosingItemProps) {
  return (
    <article
      className={`rounded-xl border transition ${
        completed
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-slate-200 bg-white hover:border-indigo-200"
      }`}
    >
      <Link
        href={href}
        prefetch={false}
        className="block px-4 py-3.5 active:scale-[0.99]"
      >
        <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            completed
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {completed ? "✓" : "·"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-950">{title}</h2>

              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                {description}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                completed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-orange-50 text-orange-600"
              }`}
            >
              {completed ? completedLabel : actionLabel}
            </span>
          </div>

          {settlement ? (
            <div className="mt-3">
              <p className="text-xs font-semibold text-indigo-500">
                예상 정산금액
              </p>

              <p className="mt-0.5 text-xl font-bold tracking-tight text-indigo-700">
                {formatMoney(settlement.expectedSettlement)}
              </p>

              <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">총매출</span>
                  <span className="shrink-0 font-semibold text-slate-700">
                    {formatMoney(settlement.grossSales)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">예상 공제액</span>
                  <span className="shrink-0 font-semibold text-slate-700">
                    {formatMoney(settlement.expectedDeduction)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">예상 정산율</span>
                  <span className="shrink-0 font-bold text-indigo-600">
                    {formatExpectedSettlementRate(
                      calculateExpectedSettlementRate(
                        settlement.grossSales,
                        settlement.expectedSettlement,
                      ),
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : details ? (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs">
              {details.map((detail) => (
                <div
                  key={detail.label}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-slate-500">{detail.label}</span>
                  <span className="shrink-0 font-semibold text-slate-700">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          ) : amount ? (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">
                  {amountLabel ?? "금액"}
                </span>
                <span
                  className={`shrink-0 font-bold ${
                    completed ? "text-emerald-700" : "text-slate-900"
                  }`}
                >
                  {amount}
                </span>
              </div>

              {secondaryAmount && secondaryLabel && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">{secondaryLabel}</span>
                  <span className="shrink-0 font-semibold text-slate-700">
                    {secondaryAmount}
                  </span>
                </div>
              )}
            </div>
          ) : null}

          </div>

          <span className="mt-1.5 shrink-0 text-xl text-slate-300">›</span>
        </div>
      </Link>

      {quickAction && (
        <div className="px-4 pb-3.5 pl-16">
          <button
            type="button"
            onClick={quickAction.onClick}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            {quickAction.label}
          </button>
        </div>
      )}
    </article>
  );
}

export default function ClosingPage() {
  const [status, setStatus] = useState<BusinessDayClosingStatus | null>(null);
  const [salesSummary, setSalesSummary] =
    useState<SalesSettlementSummary | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(
    null,
  );
  const [deliverySummary, setDeliverySummary] =
    useState<DeliveryAgencySummary | null>(null);
  const [deliveryTransactionCount, setDeliveryTransactionCount] = useState(0);
  const [selectedBusinessDate, setSelectedBusinessDateState] =
    useState<BusinessDate | null>(null);
  const [businessDateError, setBusinessDateError] = useState<string | null>(
    null,
  );
  const [quickActionError, setQuickActionError] = useState<string | null>(null);
  const [isCompletingClosing, setIsCompletingClosing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const savedBusinessDate = getSelectedBusinessDate();

    setSelectedBusinessDateState(savedBusinessDate);
    setSalesSummary(getSalesSettlementByBusinessDate(savedBusinessDate));
    setExpenseSummary(getExpenseSummaryByBusinessDate(savedBusinessDate));
    setDeliverySummary(getDeliverySummaryByBusinessDate(savedBusinessDate));
    setDeliveryTransactionCount(
      getDeliveryTransactionsByBusinessDate(savedBusinessDate).length,
    );
    setStatus(getClosingStatusByBusinessDate(savedBusinessDate));

    setIsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const salesTotal = salesSummary?.total.grossSales ?? 0;
  const platformExpectedDeduction =
    salesSummary?.total.expectedDeduction ?? 0;
  const expectedTotalOperatingCost =
    platformExpectedDeduction +
    (expenseSummary?.operatingExpenseTotal ?? 0) +
    (expenseSummary?.taxPaymentTotal ?? 0) +
    (deliverySummary?.operatingExpenseTotal ?? 0);
  const simpleProfit = salesTotal - expectedTotalOperatingCost;
  const salesCompleted =
    status?.salesStatus === "confirmed" && salesTotal > 0;
  const expenseTransactionCount = expenseSummary?.transactionCount ?? 0;
  const expenseHasData = expenseTransactionCount > 0;
  const expenseCompleted =
    (status?.expenseStatus === "confirmed-with-data" && expenseHasData) ||
    (status?.expenseStatus === "confirmed-none" && !expenseHasData);
  const deliveryCompleted = status?.deliveryStatus === "confirmed";

  const completedCount = useMemo(() => {
    return [salesCompleted, expenseCompleted, deliveryCompleted].filter(
      Boolean,
    ).length;
  }, [deliveryCompleted, expenseCompleted, salesCompleted]);

  const progress = Math.round((completedCount / 3) * 100);

  const allCompleted = completedCount === 3;
  const unconfirmedCount = 3 - completedCount;

  function completeClosing() {
    if (!selectedBusinessDate || isCompletingClosing) {
      return;
    }

    setIsCompletingClosing(true);

    if (completeBusinessDayClosing(selectedBusinessDate)) {
      setStatus(getClosingStatusByBusinessDate(selectedBusinessDate));
    }

    setIsCompletingClosing(false);
  }

  function confirmNoExpensesQuick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedBusinessDate) {
      return;
    }

    const latestSummary = getExpenseSummaryByBusinessDate(selectedBusinessDate);

    if (latestSummary.transactionCount > 0) {
      setExpenseSummary(latestSummary);
      setQuickActionError("이미 입력된 비용이 있습니다.");
      return;
    }

    if (!setExpenseConfirmedNone(selectedBusinessDate)) {
      setQuickActionError("비용 없음 상태를 저장하지 못했습니다.");
      return;
    }

    setQuickActionError(null);
    setExpenseSummary(latestSummary);
    setStatus(getClosingStatusByBusinessDate(selectedBusinessDate));
  }

  function confirmNoDeliveryQuick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedBusinessDate) {
      return;
    }

    const latestTransactions =
      getDeliveryTransactionsByBusinessDate(selectedBusinessDate);

    if (latestTransactions.length > 0) {
      setDeliveryTransactionCount(latestTransactions.length);
      setDeliverySummary(getDeliverySummaryByBusinessDate(selectedBusinessDate));
      setQuickActionError("이미 입력된 배달대행사 내역이 있습니다.");
      return;
    }

    if (!setSectionConfirmed(selectedBusinessDate, "delivery")) {
      setQuickActionError("배달대행사 없음 상태를 저장하지 못했습니다.");
      return;
    }

    setQuickActionError(null);
    setDeliveryTransactionCount(0);
    setDeliverySummary(getDeliverySummaryByBusinessDate(selectedBusinessDate));
    setStatus(getClosingStatusByBusinessDate(selectedBusinessDate));
  }

  function changeBusinessDate(date: string) {
    if (!isValidBusinessDate(date)) {
      setBusinessDateError(
        "영업일을 변경하지 못했습니다. 다시 시도해주세요.",
      );
      return;
    }

    if (!setSelectedBusinessDate(date)) {
      setBusinessDateError(
        "영업일을 변경하지 못했습니다. 다시 시도해주세요.",
      );
      return;
    }

    setBusinessDateError(null);
    setSelectedBusinessDateState(date);
    setSalesSummary(getSalesSettlementByBusinessDate(date));
    setExpenseSummary(getExpenseSummaryByBusinessDate(date));
    setDeliverySummary(getDeliverySummaryByBusinessDate(date));
    setDeliveryTransactionCount(
      getDeliveryTransactionsByBusinessDate(date).length,
    );
    setStatus(getClosingStatusByBusinessDate(date));
    setQuickActionError(null);
  }

  if (
    !isLoaded ||
    !salesSummary ||
    !expenseSummary ||
    !deliverySummary ||
    !selectedBusinessDate ||
    !status
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          마감 내용을 불러오고 있어요.
        </p>
      </main>
    );
  }

  const closingCompleted = status.closingStatus === "completed";
  const expenseCompletedLabel =
    status.expenseStatus === "confirmed-none" && !expenseHasData
      ? "없음 확인"
      : "완료";
  const deliveryNoneConfirmed =
    deliveryCompleted && deliveryTransactionCount === 0;
  const deliveryCompletedLabel = deliveryNoneConfirmed
    ? "없음 확인"
    : "확인 완료";

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-3">
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-md rounded-2xl bg-white px-4 pb-28 pt-4 shadow-sm">
        <header>
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-700 transition hover:bg-slate-100"
            aria-label="홈으로 돌아가기"
          >
            ‹
          </Link>

          <section className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label
              htmlFor="business-date"
              className="text-xs font-bold text-slate-600"
            >
              영업일
            </label>

            <input
              id="business-date"
              type="date"
              value={selectedBusinessDate}
              onChange={(event) => changeBusinessDate(event.target.value)}
              className="mt-1.5 block min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />

            {businessDateError && (
              <p className="mt-2 text-xs leading-5 text-rose-600">
                {businessDateError}
              </p>
            )}
          </section>

          <div className="mt-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              마감
            </h1>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              원하는 항목부터 확인해도 괜찮아요.
            </p>
          </div>
        </header>

        {closingCompleted || allCompleted ? (
          <section className="mt-5 rounded-xl bg-emerald-500 p-4 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg">
              ✓
            </div>

            <p className="mt-3 text-xs font-medium text-emerald-100">
              {closingCompleted
                ? "선택한 영업일의 마감을 완료했어요."
                : "매출·비용·배달대행사를 모두 확인했어요."}
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {closingCompleted ? "마감 완료" : "확인 완료"}
            </h2>

            <p className="mt-1.5 text-xs leading-5 text-emerald-50">
              {closingCompleted
                ? "필요하면 입력 내용을 다시 확인하거나 수정할 수 있어요."
                : "아래 최종 마감 버튼으로 오늘 마감을 완료해주세요."}
            </p>
          </section>
        ) : (
          <section className="mt-5 rounded-xl bg-indigo-600 p-4 text-white">
            <p className="text-xs font-medium text-indigo-100">
              현재 마감 진행률
            </p>

            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold">{progress}%</p>

                <p className="mt-1 text-xs text-indigo-100">
                  {completedCount} / 3 완료
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-indigo-200">현재 총매출</p>

                <p className="mt-0.5 text-lg font-bold">
                  {formatMoney(salesTotal)}
                </p>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
        )}

        <section className="mt-4 space-y-2">
          <ClosingItem
            title="매출"
            description="플랫폼별 매출을 입력하고 확인합니다."
            settlement={salesSummary.total}
            completed={salesCompleted}
            href="/closing/sales"
            actionLabel={salesTotal > 0 ? "확인 필요" : "미입력"}
          />

          <ClosingItem
            title="비용"
            description={
              expenseHasData
                ? `${expenseTransactionCount}건의 비용 거래를 확인합니다.`
                : "오늘 발생한 비용을 확인해주세요."
            }
            amount={formatMoney(expenseSummary.operatingExpenseTotal)}
            amountLabel="오늘 운영비용"
            secondaryAmount={formatMoney(expenseSummary.taxPaymentTotal)}
            secondaryLabel="실제 세금 납부"
            completed={expenseCompleted}
            completedLabel={expenseCompletedLabel}
            href="/closing/expenses"
            actionLabel="확인 필요"
            quickAction={
              !expenseHasData && status.expenseStatus === "unconfirmed"
                ? {
                    label: "오늘 비용 없음",
                    onClick: confirmNoExpensesQuick,
                  }
                : undefined
            }
          />

          <ClosingItem
            title="배달대행사"
            description={
              deliverySummary.transactionCount > 0
                ? `${deliverySummary.transactionCount}건의 거래를 확인합니다.`
                : "오늘 배달대행사 사용 여부를 확인해주세요."
            }
            details={[
              {
                label: "실제 운영비용",
                value: formatMoney(deliverySummary.operatingExpenseTotal),
              },
              {
                label: "외부 현금 유출",
                value: formatMoney(
                  deliverySummary.externalCashOutflowTotal,
                ),
              },
              {
                label: "예상 매입세액",
                value: formatMoney(
                  deliverySummary.estimatedInputVatTotal,
                ),
              },
              {
                label: "예상 캐시 잔액",
                value: formatMoney(deliverySummary.closingCashBalance),
              },
            ]}
            completed={deliveryCompleted}
            completedLabel={deliveryCompletedLabel}
            href="/closing/delivery"
            actionLabel="미확인"
            quickAction={
              deliveryTransactionCount === 0 &&
              status.deliveryStatus === "unconfirmed"
                ? {
                    label: "오늘 사용 안함",
                    onClick: confirmNoDeliveryQuick,
                  }
                : undefined
            }
          />
        </section>

        {quickActionError && (
          <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            {quickActionError}
          </p>
        )}

        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              현재 총매출
            </span>

            <span className="text-base font-bold text-slate-950">
              {formatMoney(salesTotal)}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              예상 총 운영비용
            </span>

            <span className="text-base font-bold text-slate-950">
              {formatMoney(expectedTotalOperatingCost)}
            </span>
          </div>

          <div className="my-3 border-t border-slate-200" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              현재 단순 손익
            </span>

            <span className="text-xl font-bold text-indigo-600">
              {formatMoney(simpleProfit)}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-4 text-slate-400">
            현재는 오늘의 손익을 기준으로 계산됩니다. 플랫폼 예상 공제액과
            입력된 비용이 포함됩니다.
          </p>
        </section>

        <section className="mt-7 border-t border-slate-200 pt-5">
          <p className="text-center text-sm font-medium text-slate-600">
            {closingCompleted ? (
              <>
                <span className="block">마감을 완료했습니다.</span>
                {unconfirmedCount > 0 && (
                  <span className="mt-1 block text-xs text-slate-500">
                    아직 확인하지 않은 항목이 {unconfirmedCount}개 있습니다.
                  </span>
                )}
              </>
            ) : allCompleted
              ? "모든 항목을 확인했습니다."
              : (
                <>
                  <span className="block">
                    아직 확인하지 않은 항목이 {unconfirmedCount}개 있습니다.
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    입력한 내용으로 마감을 완료할 수 있습니다.
                  </span>
                </>
              )}
          </p>

          <button
            type="button"
            onClick={completeClosing}
            disabled={closingCompleted || isCompletingClosing}
            className={`mt-4 min-h-14 w-full rounded-2xl px-4 text-center text-base font-bold transition ${
              closingCompleted
                ? "cursor-not-allowed bg-emerald-100 text-emerald-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-wait disabled:bg-indigo-400"
            }`}
          >
            {formatClosingButtonDate(selectedBusinessDate)} 마감{" "}
            {closingCompleted ? "완료" : "완료하기"}
          </button>
        </section>

        {closingCompleted && (
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
