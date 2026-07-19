"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  formatInventoryMonth,
  getCurrentInventoryMonth,
} from "@/lib/inventory/inventory-month";
import {
  getMonthlyInventoryRecord,
  saveBeginningInventory,
} from "@/lib/storage/monthly-inventory-storage";
import {
  getStoreSettings,
  setInventoryProfitEnabled,
} from "@/lib/storage/store-settings-storage";
import type { InventoryMonth } from "@/types/inventory";

function parseAmount(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const amount = Number(value.replace(/\D/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function formatInputAmount(value: string): string {
  const amount = parseAmount(value);
  return amount === null ? "" : amount.toLocaleString("ko-KR");
}

export default function InventorySettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [month, setMonth] = useState<InventoryMonth>(
    getCurrentInventoryMonth(),
  );
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after mount. */
  useEffect(() => {
    const currentMonth = getCurrentInventoryMonth();
    const record = getMonthlyInventoryRecord(currentMonth);

    setEnabled(getStoreSettings().inventoryProfitEnabled);
    setMonth(currentMonth);
    setAmount(
      record?.beginningInventory === null ||
        record?.beginningInventory === undefined
        ? ""
        : String(record.beginningInventory),
    );
    setIsLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function changeMonth(nextMonth: string) {
    const record = getMonthlyInventoryRecord(nextMonth);
    setMonth(nextMonth);
    setAmount(
      record?.beginningInventory === null ||
        record?.beginningInventory === undefined
        ? ""
        : String(record.beginningInventory),
    );
    setMessage(null);
    setError(null);
  }

  function changeEnabled(nextEnabled: boolean) {
    if (!setInventoryProfitEnabled(nextEnabled)) {
      setError("재고 손익 설정을 저장하지 못했습니다.");
      return;
    }

    setEnabled(nextEnabled);
    setMessage(nextEnabled ? "재고 손익 반영을 사용합니다." : "재고 손익 반영을 사용하지 않습니다.");
    setError(null);
  }

  function saveBeginning() {
    const parsedAmount = parseAmount(amount);

    if (parsedAmount === null) {
      setError("기초재고금액을 입력해주세요. 0원도 저장할 수 있습니다.");
      return;
    }

    if (!saveBeginningInventory(month, parsedAmount)) {
      setError("기초재고를 저장하지 못했습니다.");
      return;
    }

    const saved = getMonthlyInventoryRecord(month);
    setAmount(String(saved?.beginningInventory ?? parsedAmount));
    setMessage(`${formatInventoryMonth(month)} 기초재고를 저장했습니다.`);
    setError(null);
  }

  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100"><p className="text-sm text-slate-500">재고 설정을 불러오는 중</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link href="/more/store" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100" aria-label="내 가게 설정으로 돌아가기">‹</Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">기초재고 설정</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">월 시작 시 보유한 식자재와 포장재의 매입원가 기준 재고금액을 입력하세요.</p>
        </header>

        <section className="mt-7 rounded-2xl border border-slate-200 p-4">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span><span className="block text-sm font-bold text-slate-900">월별 재고를 손익에 반영하기</span><span className="mt-1 block text-xs leading-5 text-slate-500">사용하면 기초재고와 월말재고를 반영해 실제 사용한 재료비를 계산합니다.</span></span>
            <input type="checkbox" checked={enabled} onChange={(event) => changeEnabled(event.target.checked)} className="mt-1 h-5 w-5 accent-indigo-600" />
          </label>
        </section>

        <section className="mt-5 space-y-4">
          <label className="block"><span className="text-sm font-bold text-slate-800">적용 월</span><input type="month" value={month} onChange={(event) => changeMonth(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400" /></label>
          <label className="block"><span className="text-sm font-bold text-slate-800">기초재고금액</span><span className="mt-1 block text-xs leading-5 text-slate-500">식자재·소스·음료·포장재를 매입원가 기준으로 합산하세요.</span><div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-indigo-400"><input type="text" inputMode="numeric" value={formatInputAmount(amount)} placeholder="0" onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 bg-transparent py-4 text-right text-xl font-bold text-slate-950 outline-none" /><span className="ml-2 text-sm text-slate-500">원</span></div></label>
        </section>

        {message && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

        <button type="button" onClick={saveBeginning} className="mt-6 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700">기초재고 저장</button>
      </div>
    </main>
  );
}
