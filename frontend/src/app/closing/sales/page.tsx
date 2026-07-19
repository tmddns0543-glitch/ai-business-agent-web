"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { SalesSettlementSummary } from "@/lib/settlement/calculate-sales-settlement";
import {
  calculateExpectedSettlementRate,
  formatExpectedSettlementRate,
} from "@/lib/settlement/calculate-settlement-rate";
import { getSalesSettlementFromStorage } from "@/lib/settlement/get-sales-settlement-from-storage";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import {
  getClosingStatusByBusinessDate,
  setSectionConfirmed,
} from "@/lib/storage/closing-status-by-business-day-storage";
import {
  formatBusinessDate,
  type BusinessDate,
} from "@/types/business-day";
import type { SettlementResult } from "@/types/settlement";

function formatMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${safeValue.toLocaleString("ko-KR")}원`;
}

type PlatformCardProps = {
  name: string;
  description: string;
  settlement: SettlementResult;
  status: "completed" | "not-started";
  href?: string;
};

function PlatformCard({
  name,
  description,
  settlement,
  status,
  href,
}: PlatformCardProps) {
  const isCompleted = status === "completed";
  const expectedSettlementRate = calculateExpectedSettlementRate(
    settlement.grossSales,
    settlement.expectedSettlement,
  );

  const content = (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
          isCompleted
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {name.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-base font-bold text-slate-900">
            {name}
          </h2>

          <span
            className={`shrink-0 text-xs font-semibold ${
              isCompleted ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {isCompleted ? "입력 완료" : "미입력"}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-500">{description}</p>

        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-indigo-500">
            예상 정산금액
          </p>

          <p className="mt-1 text-xl font-bold tracking-tight text-indigo-700">
            {formatMoney(settlement.expectedSettlement)}
          </p>

          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">예상 정산율</span>
            <span className="shrink-0 font-bold text-indigo-600">
              {formatExpectedSettlementRate(expectedSettlementRate)}
            </span>
          </div>

          <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
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
          </div>
        </div>
      </div>

      {href && (
        <span className="shrink-0 text-xl text-slate-300" aria-hidden="true">
          ›
        </span>
      )}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default function SalesPage() {
  const router = useRouter();
  const [summary, setSummary] =
    useState<SalesSettlementSummary | null>(null);
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [isNoSalesConfirmed, setIsNoSalesConfirmed] = useState(false);
  const [isNoSalesDialogOpen, setIsNoSalesDialogOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const selectedBusinessDate = getSelectedBusinessDate();

    setBusinessDate(selectedBusinessDate);
    setSummary(getSalesSettlementFromStorage());
    setIsNoSalesConfirmed(
      getClosingStatusByBusinessDate(selectedBusinessDate).salesStatus ===
        "confirmed",
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!summary || !businessDate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          정산 정보를 불러오는 중
        </p>
      </main>
    );
  }

  const baeminSettlement = summary.platforms.baemin;
  const coupangEatsSettlement = summary.platforms["coupang-eats"];
  const yogiyoSettlement = summary.platforms.yogiyo;
  const ddangyoSettlement = summary.platforms.ddangyo;
  const generalSettlement = summary.platforms.general;

  const isBaeminCompleted = baeminSettlement.grossSales > 0;
  const isCoupangEatsCompleted = coupangEatsSettlement.grossSales > 0;
  const isYogiyoCompleted = yogiyoSettlement.grossSales > 0;
  const isDdangyoCompleted = ddangyoSettlement.grossSales > 0;
  const isGeneralCompleted = generalSettlement.grossSales > 0;
  const totalExpectedSettlementRate = calculateExpectedSettlementRate(
    summary.total.grossSales,
    summary.total.expectedSettlement,
  );
  const hasSales = summary.total.grossSales > 0;

  function confirmNoSales() {
    if (hasSales || !businessDate) {
      return;
    }

    if (!setSectionConfirmed(businessDate, "sales")) {
      setStatusError("매출 없음 상태를 저장하지 못했습니다. 다시 시도해주세요.");
      setIsNoSalesDialogOpen(false);
      return;
    }

    setIsNoSalesConfirmed(true);
    setStatusError(null);
    setIsNoSalesDialogOpen(false);
    router.push("/closing");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-28 pt-6 shadow-sm">
        <header>
          <Link
            href="/closing"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="마감 화면으로 돌아가기"
          >
            ‹
          </Link>

          <p className="mt-5 text-sm font-medium text-slate-500">
            {formatBusinessDate(businessDate)}
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            매출
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            입력할 플랫폼을 선택해주세요.
          </p>
        </header>

        <section className="mt-6 rounded-3xl bg-indigo-50 p-5">
          <p className="text-sm font-semibold text-indigo-500">
            오늘 매출 정산 예상
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-indigo-500">
                전체 예상 정산금액
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-indigo-700">
                {formatMoney(summary.total.expectedSettlement)}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-indigo-100 pt-3">
              <span className="text-sm text-slate-600">전체 예상 정산율</span>
              <span className="shrink-0 font-bold text-indigo-700">
                {formatExpectedSettlementRate(totalExpectedSettlementRate)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">전체 총매출</span>
              <span className="shrink-0 font-bold text-slate-800">
                {formatMoney(summary.total.grossSales)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">
                전체 예상 공제액
              </span>
              <span className="shrink-0 font-bold text-slate-800">
                {formatMoney(summary.total.expectedDeduction)}
              </span>
            </div>

          </div>
        </section>

        <section className="mt-6 space-y-3">
          <PlatformCard
            name="배달의민족"
            description="선결제 · 카드 · 현금 · 배민원"
            settlement={baeminSettlement}
            status={isBaeminCompleted ? "completed" : "not-started"}
            href="/closing/sales/baemin"
          />

          <PlatformCard
            name="쿠팡이츠"
            description="매출 · 주문 수"
            settlement={coupangEatsSettlement}
            status={
              isCoupangEatsCompleted ? "completed" : "not-started"
            }
            href="/closing/sales/coupang-eats"
          />

          <PlatformCard
            name="요기요"
            description="선결제 · 카드 · 현금 · 요기배달"
            settlement={yogiyoSettlement}
            status={
              isYogiyoCompleted ? "completed" : "not-started"
            }
            href="/closing/sales/yogiyo"
          />

          <PlatformCard
            name="땡겨요"
            description="선결제"
            settlement={ddangyoSettlement}
            status={
              isDdangyoCompleted
                ? "completed"
                : "not-started"
            }
            href="/closing/sales/ddangyo"
          />

          <PlatformCard
            name="일반결제"
            description="카드 · 현금 · 계좌이체"
            settlement={generalSettlement}
            status={
              isGeneralCompleted ? "completed" : "not-started"
            }
            href="/closing/sales/general"
          />
        </section>

        {hasSales ? (
          <button
            type="button"
            onClick={() => {
              if (setSectionConfirmed(businessDate, "sales")) {
                router.push("/closing");
              } else {
                setStatusError("매출 확인 상태를 저장하지 못했습니다.");
              }
            }}
            className="mt-7 w-full rounded-2xl bg-indigo-600 px-4 py-4 text-center text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            매출 확인 완료
          </button>
        ) : isNoSalesConfirmed ? (
          <p className="mt-7 rounded-xl bg-emerald-50 px-4 py-4 text-center text-sm font-bold text-emerald-700">
            오늘 매출 없음 확인 완료
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setIsNoSalesDialogOpen(true)}
            className="mt-7 w-full rounded-2xl bg-slate-900 px-4 py-4 text-center text-base font-bold text-white transition hover:bg-slate-800 active:scale-[0.99]"
          >
            오늘 매출 없음
          </button>
        )}

        {statusError && (
          <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {statusError}
          </p>
        )}

        <nav className="fixed bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-around rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-lg">
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

      {isNoSalesDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="no-sales-dialog-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="no-sales-dialog-title" className="text-lg font-bold text-slate-950">
              오늘 매출이 없었습니까?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              선택한 영업일의 매출을 0원으로 확인합니다. 저장된 매출 데이터가 있는 경우에는 사용할 수 없습니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsNoSalesDialogOpen(false)} className="min-h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
                취소
              </button>
              <button type="button" onClick={confirmNoSales} className="min-h-12 rounded-xl bg-slate-900 text-sm font-bold text-white">
                매출 없음 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
