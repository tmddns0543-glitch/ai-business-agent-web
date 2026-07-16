"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EXPENSE_GROUPS } from "@/data/expense-default-items";
import { getExpenseSummaryByBusinessDate } from "@/lib/expense/get-expense-summary-from-storage";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import {
  getClosingStatusByBusinessDate,
  setExpenseConfirmedNone,
  setExpenseConfirmedWithData,
} from "@/lib/storage/closing-status-by-business-day-storage";
import {
  getDailyExpenseMemo,
  saveDailyExpenseMemo,
} from "@/lib/storage/daily-expense-memo-storage";
import {
  formatBusinessDate,
  type BusinessDate,
} from "@/types/business-day";
import type { BusinessDayClosingStatus } from "@/types/closing-status-by-business-day";
import type { ExpenseSummary } from "@/types/expense-storage";

function formatMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${safeValue.toLocaleString("ko-KR")}원`;
}

function getExpenseStatusLabel(
  status: BusinessDayClosingStatus["expenseStatus"],
) {
  if (status === "confirmed-with-data") {
    return "완료";
  }

  if (status === "confirmed-none") {
    return "없음 확인";
  }

  return "확인 필요";
}

export default function ExpensesPage() {
  const router = useRouter();
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [closingStatus, setClosingStatus] =
    useState<BusinessDayClosingStatus | null>(null);
  const [memo, setMemo] = useState("");
  const [memoMessage, setMemoMessage] = useState<string | null>(null);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const selectedBusinessDate = getSelectedBusinessDate();

    setBusinessDate(selectedBusinessDate);
    setSummary(getExpenseSummaryByBusinessDate(selectedBusinessDate));
    setClosingStatus(getClosingStatusByBusinessDate(selectedBusinessDate));
    setMemo(getDailyExpenseMemo(selectedBusinessDate)?.memo ?? "");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!businessDate || !summary || !closingStatus) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          비용 내용을 불러오고 있어요.
        </p>
      </main>
    );
  }

  const hasTransactions = summary.transactionCount > 0;
  const statusLabel =
    hasTransactions && closingStatus.expenseStatus === "confirmed-none"
      ? "확인 필요"
      : getExpenseStatusLabel(closingStatus.expenseStatus);

  function saveMemo() {
    if (!businessDate || isSavingMemo) {
      return;
    }

    setIsSavingMemo(true);

    if (saveDailyExpenseMemo(businessDate, memo)) {
      const savedMemo = getDailyExpenseMemo(businessDate);

      setMemo(savedMemo?.memo ?? "");
      setMemoMessage("메모를 저장했습니다.");
    } else {
      setMemoMessage("메모를 저장하지 못했습니다. 다시 시도해주세요.");
    }

    setIsSavingMemo(false);
  }

  function confirmExpenses() {
    if (!businessDate || !hasTransactions || isConfirming) {
      return;
    }

    setIsConfirming(true);

    if (setExpenseConfirmedWithData(businessDate)) {
      setClosingStatus(getClosingStatusByBusinessDate(businessDate));
      router.push("/closing");
      return;
    }

    setIsConfirming(false);
    window.alert("비용 확인 상태를 저장하지 못했습니다.");
  }

  function confirmNoExpenses() {
    if (!businessDate || hasTransactions || isConfirming) {
      return;
    }

    setIsConfirming(true);

    if (setExpenseConfirmedNone(businessDate)) {
      setClosingStatus(getClosingStatusByBusinessDate(businessDate));
      router.push("/closing");
      return;
    }

    setIsConfirming(false);
    window.alert("비용 없음 상태를 저장하지 못했습니다.");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-3">
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-md rounded-2xl bg-white px-4 pb-28 pt-4 shadow-sm">
        <header>
          <Link
            href="/closing"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-700 transition hover:bg-slate-100"
            aria-label="마감 화면으로 돌아가기"
          >
            ‹
          </Link>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                비용
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {formatBusinessDate(businessDate)} 영업일
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                statusLabel === "확인 필요"
                  ? "bg-orange-50 text-orange-600"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </header>

        <section className="mt-5 space-y-2">
          {EXPENSE_GROUPS.map((group) => {
            const defaultDescription: string = group.description;
            const transactionCount =
              summary.transactionCountByGroup[group.id];
            const total = summary.byGroup[group.id];
            const isMaterialPurchase = group.id === "material-purchase";
            const isPlatformCost = group.id === "platform-cost";
            const isFixedCost = group.id === "fixed-cost";
            const isOperatingCost = group.id === "operating-cost";
            const isLaborCost = group.id === "labor-cost";
            const isTaxPayment = group.id === "tax-payment";
            const href = isMaterialPurchase
              ? "/closing/expenses/material-purchase"
              : isPlatformCost
                ? "/closing/expenses/platform-cost"
                : isFixedCost
                  ? "/closing/expenses/fixed-cost"
                  : isOperatingCost
                    ? "/closing/expenses/operating-cost"
                    : isLaborCost
                      ? "/closing/expenses/labor-cost"
                      : isTaxPayment
                        ? "/closing/expenses/tax-payment"
                        : null;

            const content = (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-indigo-200">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900">
                          {group.label}
                        </h2>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                          {isMaterialPurchase
                            ? "거래처별 매입 기록"
                            : isPlatformCost
                              ? "광고비·쿠폰비"
                              : isFixedCost
                                ? "월세·전기세·가스비 등"
                                : isOperatingCost
                                  ? "비품·복리후생비·주유비 등"
                                  : isLaborCost
                                    ? "급여·4대보험·기타 인건비"
                                    : isTaxPayment
                                      ? "부가가치세·종합소득세·원천세 등"
                                      : defaultDescription}
                        </p>
                      </div>

                      {!href && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          준비 중
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-xs text-slate-500">
                        {transactionCount > 0
                          ? `${transactionCount}건`
                          : "미입력"}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatMoney(total)}
                      </span>
                    </div>
                  </div>

                  <span className="mt-1 shrink-0 text-xl text-slate-300">
                    ›
                  </span>
                </div>
              </div>
            );

            if (href) {
              return (
                <Link
                  key={group.id}
                  href={href}
                  className="block active:scale-[0.99]"
                >
                  {content}
                </Link>
              );
            }

            return <article key={group.id}>{content}</article>;
          })}
        </section>

        <section className="mt-5 rounded-xl bg-indigo-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-indigo-700">
              오늘 총 현금 지출
            </span>
            <span className="text-xl font-bold text-indigo-700">
              {formatMoney(summary.totalCashOutflow)}
            </span>
          </div>

          <div className="mt-3 space-y-2 border-t border-indigo-100 pt-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">오늘 운영비용</span>
              <span className="font-semibold text-slate-800">
                {formatMoney(summary.operatingExpenseTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">실제 세금 납부</span>
              <span className="font-semibold text-slate-800">
                {formatMoney(summary.taxPaymentTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">예상 매입세액</span>
              <span className="font-semibold text-slate-600">
                {formatMoney(summary.estimatedInputVatTotal)}
              </span>
            </div>
          </div>

          <p className="mt-2 text-[11px] leading-4 text-slate-400">
            현재 입력 기준 단순 예상치입니다.
          </p>
        </section>

        <section className="mt-5">
          <label
            htmlFor="expense-memo"
            className="text-sm font-bold text-slate-800"
          >
            비용 메모
          </label>
          <textarea
            id="expense-memo"
            value={memo}
            onChange={(event) => {
              setMemo(event.target.value);
              setMemoMessage(null);
            }}
            rows={4}
            placeholder="이 영업일의 비용 관련 내용을 남겨주세요."
            className="mt-2 block w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={saveMemo}
            disabled={isSavingMemo}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:text-slate-400"
          >
            {isSavingMemo ? "저장 중..." : "메모 저장"}
          </button>
          {memoMessage && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {memoMessage}
            </p>
          )}
        </section>

        <section className="mt-7 border-t border-slate-200 pt-5">
          {hasTransactions ? (
            <button
              type="button"
              onClick={confirmExpenses}
              disabled={isConfirming}
              className="min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-wait disabled:bg-indigo-400"
            >
              {isConfirming ? "확인 중..." : "비용 확인 완료"}
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmNoExpenses}
              disabled={isConfirming}
              className="min-h-14 w-full rounded-2xl bg-slate-900 px-4 text-base font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-wait disabled:bg-slate-500"
            >
              {isConfirming ? "확인 중..." : "오늘 발생한 비용 없음"}
            </button>
          )}
        </section>

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
          <Link href="/more" className="px-4 py-2 text-sm text-slate-500">
            더보기
          </Link>
        </nav>
      </div>
    </main>
  );
}
