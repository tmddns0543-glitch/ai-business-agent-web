import Link from "next/link";

const SALES_CHANNELS: readonly {
  name: string;
  href: string;
}[] = [
  {
    name: "배달의민족",
    href: "/more/store/sales-channels/baemin",
  },
  {
    name: "쿠팡이츠",
    href: "/more/store/sales-channels/coupang-eats",
  },
  { name: "요기요", href: "/more/store/sales-channels/yogiyo" },
  { name: "땡겨요", href: "/more/store/sales-channels/ddangyo" },
  { name: "일반결제", href: "/more/store/sales-channels/general" },
];

export default function SalesChannelSettingsPage() {
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
            매출채널 설정
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            플랫폼별 계약 수수료와 건당 배달료를 설정할 수 있습니다.
          </p>
        </header>

        <section className="mt-7 space-y-3" aria-label="매출채널 목록">
          {SALES_CHANNELS.map((channel) => {
            const content = (
              <>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    {channel.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    계약 수수료와 배달료
                  </p>
                </div>

                <span
                  className="shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600"
                >
                  설정하기
                </span>
              </>
            );

            return (
              <Link
                key={channel.name}
                href={channel.href}
                className="flex min-h-24 items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm active:scale-[0.99]"
              >
                {content}
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
