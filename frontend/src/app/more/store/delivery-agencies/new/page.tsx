import Link from "next/link";

import { DeliveryAgencySettingForm } from "@/components/settings/delivery-agency-setting-form";

export default function NewDeliveryAgencyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link href="/more/store/delivery-agencies" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100" aria-label="배달대행사 설정으로 돌아가기">‹</Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">배달대행사 추가</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">대행사별 초기 캐시와 충전수수료 방식을 입력하세요.</p>
        </header>
        <DeliveryAgencySettingForm />
      </div>
    </main>
  );
}
