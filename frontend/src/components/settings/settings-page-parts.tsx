import Link from "next/link";
import type { ReactNode } from "react";

export function SettingsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <p className="text-sm font-medium text-slate-500">설정을 불러오는 중</p>
    </main>
  );
}

export function SettingsPageLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link
            href="/more/store/sales-channels"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="매출채널 설정으로 돌아가기"
          >
            ‹
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </header>
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}

export function SettingsFormActions({
  message,
  onRestore,
}: {
  message: string;
  onRestore: () => void;
}) {
  return (
    <>
      <p className="mt-5 text-xs leading-5 text-slate-400">
        플랫폼 계약과 가게 조건에 따라 실제 수수료가 다를 수 있습니다.
      </p>
      {message && (
        <p
          role="status"
          className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          {message}
        </p>
      )}
      <div className="mt-6 space-y-3">
        <button
          type="submit"
          className="w-full rounded-2xl bg-indigo-600 px-4 py-4 text-base font-bold text-white"
        >
          저장하기
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-500"
        >
          기본값으로 되돌리기
        </button>
        <Link
          href="/closing/sales"
          className="block px-4 py-3 text-center text-sm font-semibold text-indigo-600"
        >
          정산 예상금액 확인하기
        </Link>
      </div>
    </>
  );
}
