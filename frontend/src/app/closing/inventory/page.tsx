"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  formatInventoryMonth,
  getInventoryMonthFromBusinessDate,
  isCalendarMonthEnd,
} from "@/lib/inventory/inventory-month";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { reopenBusinessDayClosing } from "@/lib/storage/closing-status-by-business-day-storage";
import {
  confirmNoEndingInventory,
  deleteMonthlyInventoryRecord,
  getMonthlyInventoryRecord,
  resetEndingInventory,
  saveEndingInventory,
} from "@/lib/storage/monthly-inventory-storage";
import { getStoreSettings } from "@/lib/storage/store-settings-storage";
import type { BusinessDate } from "@/types/business-day";
import type { MonthlyInventoryRecord } from "@/types/inventory";

function parseAmount(value: string): number | null {
  if (value.trim() === "") return null;
  const amount = Number(value.replace(/\D/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function formatInputAmount(value: string): string {
  const amount = parseAmount(value);
  return amount === null ? "" : amount.toLocaleString("ko-KR");
}

function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "미입력"
    : `${value.toLocaleString("ko-KR")}원`;
}

export default function ClosingInventoryPage() {
  const router = useRouter();
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [record, setRecord] = useState<MonthlyInventoryRecord | undefined>();
  const [amount, setAmount] = useState("");
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage inventory hydrates after mount. */
  useEffect(() => {
    const date = getSelectedBusinessDate();
    const month = getInventoryMonthFromBusinessDate(date);
    const saved = getMonthlyInventoryRecord(month);

    setBusinessDate(date);
    setAvailable(
      getStoreSettings().inventoryProfitEnabled && isCalendarMonthEnd(date),
    );
    setRecord(saved);
    setAmount(
      saved?.endingInventory === null || saved?.endingInventory === undefined
        ? ""
        : String(saved.endingInventory),
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!businessDate) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100"><p className="text-sm text-slate-500">월말재고를 불러오는 중</p></main>;
  }

  const month = getInventoryMonthFromBusinessDate(businessDate);
  const selectedBusinessDate = businessDate;

  function restore(previous: MonthlyInventoryRecord | undefined) {
    if (!previous) {
      deleteMonthlyInventoryRecord(month);
    } else if (previous.endingInventoryStatus === "confirmed") {
      saveEndingInventory(month, previous.endingInventory ?? 0);
    } else {
      resetEndingInventory(month);
    }
  }

  function completeSave(nextAmount: number) {
    if (
      record?.endingInventoryStatus === "confirmed" &&
      record.endingInventory === nextAmount
    ) {
      router.push("/closing");
      return;
    }

    const previous = record;

    if (!saveEndingInventory(month, nextAmount)) {
      setError("월말재고를 저장하지 못했습니다.");
      return;
    }

    if (!reopenBusinessDayClosing(selectedBusinessDate)) {
      restore(previous);
      setError("마감 상태를 다시 열지 못했습니다.");
      return;
    }

    router.push("/closing");
  }

  function saveEnding() {
    const parsed = parseAmount(amount);
    if (parsed === null) {
      setError("월말재고금액을 입력해주세요. 0원도 저장할 수 있습니다.");
      return;
    }
    completeSave(parsed);
  }

  function confirmNone() {
    const previous = record;
    if (!confirmNoEndingInventory(month)) {
      setError("재고 없음 상태를 저장하지 못했습니다.");
      return;
    }
    if (!reopenBusinessDayClosing(selectedBusinessDate)) {
      restore(previous);
      setError("마감 상태를 다시 열지 못했습니다.");
      return;
    }
    router.push("/closing");
  }

  function resetEnding() {
    const previous = record;
    if (!resetEndingInventory(month)) {
      setError("월말재고를 초기화하지 못했습니다.");
      return;
    }
    if (!reopenBusinessDayClosing(selectedBusinessDate)) {
      restore(previous);
      setError("마감 상태를 다시 열지 못했습니다.");
      return;
    }
    router.push("/closing");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header><Link href="/closing" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100" aria-label="마감으로 돌아가기">‹</Link><h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">월말재고</h1><p className="mt-2 text-sm leading-6 text-slate-500">이번 달 마지막 날 기준으로 남아 있는 식자재와 포장재의 매입원가를 입력하세요.</p></header>

        {!available ? (
          <section className="mt-7 rounded-xl bg-slate-50 px-4 py-6 text-center"><p className="text-sm leading-6 text-slate-500">재고 손익 설정이 꺼져 있거나 선택한 영업일이 달력상 월 말일이 아닙니다.</p></section>
        ) : (
          <>
            <section className="mt-7 rounded-2xl bg-indigo-50 p-4 text-sm"><p className="font-bold text-indigo-700">{formatInventoryMonth(month)}</p><div className="mt-3 flex justify-between border-t border-indigo-100 pt-3"><span className="text-slate-500">기초재고</span><span className="font-bold text-slate-800">{formatMoney(record?.beginningInventory)}</span></div></section>
            <label className="mt-5 block"><span className="text-sm font-bold text-slate-800">월말재고금액</span><span className="mt-1 block text-xs leading-5 text-slate-500">식자재·소스·음료·포장재를 매입원가 기준으로 합산하세요.</span><div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-indigo-400"><input type="text" inputMode="numeric" value={formatInputAmount(amount)} placeholder="0" onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 bg-transparent py-4 text-right text-xl font-bold text-slate-950 outline-none" /><span className="ml-2 text-sm text-slate-500">원</span></div></label>
            {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
            <button type="button" onClick={saveEnding} className="mt-6 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700">월말재고 저장</button>
            <button type="button" onClick={confirmNone} className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50">재고 없음</button>
            {record?.endingInventoryStatus === "confirmed" && <button type="button" onClick={() => setResetDialogOpen(true)} className="mt-3 min-h-12 w-full rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600">월말재고 초기화</button>}
          </>
        )}

        {resetDialogOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-6 sm:items-center"><section role="dialog" aria-modal="true" aria-labelledby="inventory-reset-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"><h2 id="inventory-reset-title" className="text-lg font-bold text-slate-950">월말재고 입력을 초기화하시겠습니까?</h2><p className="mt-2 text-sm leading-6 text-slate-600">선택한 월의 월말재고 입력이 삭제되고 미입력 상태로 돌아갑니다.<br />기초재고와 다른 월의 재고는 유지됩니다.</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setResetDialogOpen(false)} className="min-h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">취소</button><button type="button" onClick={resetEnding} className="min-h-12 rounded-xl bg-slate-900 text-sm font-bold text-white">초기화</button></div></section></div>}
      </div>
    </main>
  );
}
