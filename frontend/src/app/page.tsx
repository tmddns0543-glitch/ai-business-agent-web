"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto min-h-[calc(100vh-3rem)] max-w-md rounded-3xl bg-white p-5 shadow-sm">
        <header className="mb-8">
          <p className="text-sm text-slate-500">좋은 아침이에요.</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            떴다파닭 진주점
          </h1>
        </header>

        <section className="mb-5 rounded-3xl bg-indigo-600 p-6 text-white">
          <p className="text-sm text-indigo-100">현재 마감 상태</p>

          <h2 className="mt-2 text-2xl font-bold">
            7월 12일 마감이 남아 있어요
          </h2>

          <p className="mt-2 text-sm text-indigo-100">
            매출과 비용을 확인하고 오늘 마감을 끝내보세요.
          </p>

          <Link
            href="/closing"
            className="mt-6 block rounded-2xl bg-white px-4 py-4 text-center font-semibold text-indigo-700"
          >
            마감 시작하기
          </Link>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            최근 마감 결과
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">총매출</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                745,000원
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">예상 정산금액</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                682,600원
              </p>
            </div>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            이번 달
          </h2>

          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                이번 달 총매출
              </span>

              <span className="font-semibold text-slate-900">
                18,420,000원
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                예상 영업이익
              </span>

              <span className="font-semibold text-emerald-600">
                2,560,000원
              </span>
            </div>
          </div>
        </section>

        <nav className="fixed bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-around rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-lg">
          <Link
            href="/"
            className="text-sm font-semibold text-indigo-600"
          >
            홈
          </Link>

          <Link
            href="/closing"
            className="text-sm text-slate-500"
          >
            마감
          </Link>

          <Link
            href="/management"
            className="text-sm text-slate-500"
          >
            경영
          </Link>

          <Link
            href="/more"
            className="text-sm text-slate-500"
          >
            더보기
          </Link>
        </nav>
      </div>
    </main>
  );
}