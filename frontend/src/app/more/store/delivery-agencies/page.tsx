"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getDeliveryAgencies } from "@/lib/storage/delivery-agency-storage";
import type { DeliveryAgency } from "@/types/delivery-agency";

function formatMoney(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toLocaleString("ko-KR")}원`;
}

export default function DeliveryAgencySettingsPage() {
  const [agencies, setAgencies] = useState<DeliveryAgency[] | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after mount. */
  useEffect(() => {
    setAgencies(getDeliveryAgencies());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!agencies) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">설정을 불러오는 중</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link
            href="/more/store"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="내 가게 설정으로 돌아가기"
          >
            ‹
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            배달대행사 설정
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            이용 중인 대행사와 초기 캐시 기준을 관리하세요.
          </p>
        </header>

        <section className="mt-7 space-y-3" aria-label="배달대행사 목록">
          {agencies.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              등록된 배달대행사가 없습니다.
            </p>
          ) : (
            agencies.map((agency) => (
              <Link
                key={agency.id}
                href={`/more/store/delivery-agencies/${encodeURIComponent(agency.id)}`}
                className="block rounded-3xl border border-slate-200 p-5 transition hover:border-indigo-200 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {agency.name}
                      </h2>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${agency.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {agency.enabled ? "사용 중" : "사용 안 함"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      초기 캐시 {formatMoney(agency.initialCashBalance)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">
                    설정하기
                  </span>
                </div>
              </Link>
            ))
          )}
        </section>

        <Link
          href="/more/store/delivery-agencies/new"
          className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          + 배달대행사 추가
        </Link>
      </div>
    </main>
  );
}
