import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { requireAuthenticatedUser, requireCurrentBusiness } from "@/lib/auth/current-context";

const MORE_MENU_ITEMS = [
  {
    title: "내 가게 설정",
    description: "가게 운영에 필요한 설정을 관리합니다.",
    href: "/more/store",
  },
  {
    title: "데이터 관리",
    description: "입력한 경영 데이터를 파일로 백업하거나 복원합니다.",
    href: "/more/data",
  },
] as const;

export default async function MorePage() {
  const [user, business] = await Promise.all([
    requireAuthenticatedUser(),
    requireCurrentBusiness(),
  ]);
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-28 pt-6 shadow-sm">
        <header>
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="홈으로 돌아가기"
          >
            ‹
          </Link>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            더보기
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            가게 운영에 필요한 메뉴를 확인하세요.
          </p>
        </header>

        <section className="mt-7 rounded-2xl bg-slate-50 p-4" aria-label="계정 정보">
          <p className="text-xs font-bold text-slate-400">로그인 계정</p>
          <p className="mt-1 break-all text-sm font-semibold text-slate-800">{user.email ?? "이메일 정보 없음"}</p>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-bold text-slate-400">사업장</p>
            <p className="mt-1 text-base font-bold text-slate-900">{business.name}</p>
          </div>
          <form action={logoutAction} className="mt-4">
            <button type="submit" className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600">로그아웃</button>
          </form>
        </section>

        <section className="mt-5 space-y-3" aria-label="더보기 메뉴">
          {MORE_MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-24 items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm active:scale-[0.99]"
            >
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-950">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
              </div>

              <span className="shrink-0 text-2xl text-slate-300" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
        </section>

        <nav className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-around rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur">
          <Link href="/" className="px-4 py-2 text-sm text-slate-500">
            홈
          </Link>

          <Link
            href="/closing?entry=external"
            className="px-4 py-2 text-sm text-slate-500"
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
            className="px-4 py-2 text-sm font-bold text-indigo-600"
            aria-current="page"
          >
            더보기
          </Link>
        </nav>
      </div>
    </main>
  );
}
