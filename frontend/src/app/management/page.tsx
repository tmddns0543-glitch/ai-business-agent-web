"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { calculateDeliveryAgencySummary } from "@/lib/delivery-agency/calculate-delivery-agency-summary";
import { calculateExpenseSummary } from "@/lib/expense/calculate-expense-summary";
import { calculateMonthlyMaterialCost } from "@/lib/inventory/calculate-monthly-material-cost";
import {
  formatInventoryMonth,
  getCurrentInventoryMonth,
} from "@/lib/inventory/inventory-month";
import { getSalesSettlementByBusinessDate } from "@/lib/settlement/get-sales-settlement-from-storage";
import { getAllDeliveryTransactions } from "@/lib/storage/delivery-agency-storage";
import { getAllExpenseTransactions } from "@/lib/storage/expense-by-business-day-storage";
import { getMonthlyInventoryRecord } from "@/lib/storage/monthly-inventory-storage";
import { getBusinessDaySalesStorage } from "@/lib/storage/sales-by-business-day-storage";
import { getStoreSettings } from "@/lib/storage/store-settings-storage";
import type { InventoryMonth } from "@/types/inventory";

function formatMoney(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toLocaleString("ko-KR")}원`;
}

export default function ManagementPage() {
  const [month, setMonth] = useState<InventoryMonth>(getCurrentInventoryMonth());
  const [isLoaded, setIsLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- Monthly LocalStorage data hydrates after mount. */
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const result = useMemo(() => {
    const salesDates = Object.keys(getBusinessDaySalesStorage().days).filter(
      (date) => date.startsWith(`${month}-`),
    );
    const sales = salesDates.reduce(
      (total, date) => {
        const summary = getSalesSettlementByBusinessDate(date);
        return {
          grossSales: total.grossSales + summary.total.grossSales,
          expectedDeduction:
            total.expectedDeduction + summary.total.expectedDeduction,
        };
      },
      { grossSales: 0, expectedDeduction: 0 },
    );
    const expenses = calculateExpenseSummary(
      getAllExpenseTransactions().filter(({ businessDate }) =>
        businessDate.startsWith(`${month}-`),
      ),
    );
    const delivery = calculateDeliveryAgencySummary(
      getAllDeliveryTransactions().filter(({ businessDate }) =>
        businessDate.startsWith(`${month}-`),
      ),
      0,
    );
    const inventoryEnabled = getStoreSettings().inventoryProfitEnabled;
    const inventory = getMonthlyInventoryRecord(month);
    const material = calculateMonthlyMaterialCost({
      materialPurchases: expenses.byGroup["material-purchase"],
      inventoryProfitEnabled: inventoryEnabled,
      inventoryRecord: inventory,
      monthEnded: month < getCurrentInventoryMonth(),
    });
    const otherOperatingExpense =
      expenses.operatingExpenseTotal - material.materialPurchases;
    const totalOperatingCost =
      material.materialCost === null
        ? null
        : sales.expectedDeduction +
          otherOperatingExpense +
          material.materialCost +
          expenses.taxPaymentTotal +
          delivery.operatingExpenseTotal;

    return {
      sales,
      expenses,
      delivery,
      inventory,
      inventoryEnabled,
      material,
      totalOperatingCost,
      profit:
        totalOperatingCost === null
          ? null
          : sales.grossSales - totalOperatingCost,
    };
  }, [month]);

  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100"><p className="text-sm text-slate-500">경영성과를 불러오는 중</p></main>;
  }

  const materialLabel =
    result.material.status === "waiting"
      ? "재료비 계산 대기"
      : result.material.status === "estimated"
        ? "예상 재료비 · 월말재고 미반영"
        : result.material.inventoryApplied
          ? "재고 반영 재료비"
          : "재료매입액";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-28 pt-6 shadow-sm">
        <header><Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100" aria-label="홈으로 돌아가기">‹</Link><h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">경영성과</h1><p className="mt-2 text-sm leading-6 text-slate-500">월별 매출과 비용을 손익 기준으로 확인하세요.</p></header>
        <label className="mt-6 block"><span className="text-sm font-bold text-slate-800">조회 월</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900" /></label>

        <section className="mt-5 rounded-2xl bg-indigo-600 p-5 text-white"><p className="text-xs text-indigo-100">{formatInventoryMonth(month)} 현재 단순 손익</p><p className="mt-2 text-3xl font-bold">{result.profit === null ? "계산 대기" : formatMoney(result.profit)}</p>{result.profit === null && <p className="mt-2 text-xs leading-5 text-indigo-100">기초재고와 월말재고를 입력하면 실제 재료비가 계산됩니다.</p>}</section>

        <section className="mt-4 space-y-2 rounded-2xl border border-slate-200 p-4 text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-500">총매출</span><strong>{formatMoney(result.sales.grossSales)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">플랫폼 예상 공제액</span><strong>{formatMoney(result.sales.expectedDeduction)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">{materialLabel}</span><strong>{result.material.materialCost === null ? "미확정" : formatMoney(result.material.materialCost)}</strong></div>
          {result.inventoryEnabled && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><div className="flex justify-between"><span>기초재고</span><span>{result.inventory?.beginningInventory == null ? "미입력" : formatMoney(result.inventory.beginningInventory)}</span></div><div className="mt-1 flex justify-between"><span>재료매입</span><span>{formatMoney(result.material.materialPurchases)}</span></div><div className="mt-1 flex justify-between"><span>월말재고</span><span>{result.inventory?.endingInventory == null ? "미입력" : formatMoney(result.inventory.endingInventory)}</span></div></div>}
          <div className="flex justify-between gap-3"><span className="text-slate-500">기타 운영비용</span><strong>{formatMoney(result.expenses.operatingExpenseTotal - result.material.materialPurchases)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">실제 세금 납부</span><strong>{formatMoney(result.expenses.taxPaymentTotal)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-500">배달대행 운영비</span><strong>{formatMoney(result.delivery.operatingExpenseTotal)}</strong></div>
          <div className="mt-3 flex justify-between gap-3 border-t border-slate-200 pt-3"><span className="font-bold text-slate-700">예상 총 운영비용</span><strong className="text-indigo-600">{result.totalOperatingCost === null ? "미확정" : formatMoney(result.totalOperatingCost)}</strong></div>
        </section>

        <nav className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-around rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-lg"><Link href="/" className="px-4 py-2 text-sm text-slate-500">홈</Link><Link href="/closing?entry=external" className="px-4 py-2 text-sm text-slate-500">마감</Link><Link href="/management" className="px-4 py-2 text-sm font-bold text-indigo-600">경영</Link><Link href="/more" className="px-4 py-2 text-sm text-slate-500">더보기</Link></nav>
      </div>
    </main>
  );
}
