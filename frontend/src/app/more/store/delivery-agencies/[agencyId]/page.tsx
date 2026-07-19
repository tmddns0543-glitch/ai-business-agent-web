"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DeliveryAgencySettingForm } from "@/components/settings/delivery-agency-setting-form";
import { getDeliveryAgencyById } from "@/lib/storage/delivery-agency-storage";
import type { DeliveryAgency } from "@/types/delivery-agency";

export default function DeliveryAgencyDetailPage() {
  const params = useParams<{ agencyId: string }>();
  const agencyId = decodeURIComponent(params.agencyId);
  const [agency, setAgency] = useState<DeliveryAgency | null | undefined>(undefined);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage settings hydrate after mount. */
  useEffect(() => {
    setAgency(getDeliveryAgencyById(agencyId) ?? null);
  }, [agencyId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (agency === undefined) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100"><p className="text-sm text-slate-500">설정을 불러오는 중</p></main>;
  }

  if (agency === null) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4"><div className="text-center"><p className="text-sm text-slate-600">배달대행사를 찾을 수 없습니다.</p><Link href="/more/store/delivery-agencies" className="mt-4 inline-block text-sm font-bold text-indigo-600">목록으로 돌아가기</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5">
      <div className="mx-auto min-h-[calc(100vh-2.5rem)] max-w-md rounded-[2rem] bg-white px-5 pb-12 pt-6 shadow-sm">
        <header>
          <Link href="/more/store/delivery-agencies" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 transition hover:bg-slate-100" aria-label="배달대행사 설정으로 돌아가기">‹</Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">배달대행사 설정</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">대행사 기본 정보와 사용 여부를 관리하세요.</p>
        </header>
        <DeliveryAgencySettingForm agency={agency} />
      </div>
    </main>
  );
}
