import Link from "next/link";

import { BusinessNameForm } from "@/components/settings/business-name-form";
import { requireCurrentBusiness } from "@/lib/auth/current-context";

const STORE_SETTING_ITEMS = [
  {
    title: "매출채널 설정",
    description: "플랫폼별 계약 수수료와 정산 기준을 관리합니다.",
    href: "/more/store/sales-channels",
  },
  {
    title: "배달대행사 설정",
    description: "대행사별 초기 캐시와 충전수수료 방식을 관리합니다.",
    href: "/more/store/delivery-agencies",
  },
  {
    title: "기초재고 설정",
    description:
      "월별 기초재고와 월말재고를 반영해 실제 사용한 재료비를 계산합니다.",
    href: "/more/store/inventory",
  },
] as const;

export default async function StoreSettingsPage() {
  const business = await requireCurrentBusiness();
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link
            href="/more"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100"
            aria-label="더보기로 돌아가기"
          >
            ‹
          </Link>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            내 가게 설정
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            가게 운영 기준을 한곳에서 관리하세요.
          </p>
        </header>

        <section className="mt-7" aria-label="사업장 기본 정보">
          <BusinessNameForm initialName={business.name} canEdit={business.role === "owner"} />
        </section>

        <section className="mt-5 space-y-3" aria-label="내 가게 설정 메뉴">
          {STORE_SETTING_ITEMS.map((item) => (
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
      </div>
    </main>
  );
}
