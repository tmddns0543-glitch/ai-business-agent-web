"use client";

import { useActionState } from "react";

import { createInitialBusinessAction } from "@/app/onboarding/business/actions";
import { INITIAL_AUTH_STATE } from "@/lib/auth/action-state";

const inputClass = "mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-base outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function BusinessOnboardingForm() {
  const [state, action, pending] = useActionState(createInitialBusinessAction, INITIAL_AUTH_STATE);
  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-bold text-slate-700">사업장명<input name="businessName" required maxLength={80} className={inputClass} /></label>
      <label className="block text-sm font-bold text-slate-700">업종<input name="industry" required maxLength={80} placeholder="예: 치킨 전문점" className={inputClass} /></label>
      <label className="block text-sm font-bold text-slate-700">사업자등록번호 <span className="font-normal text-slate-400">선택</span><input name="registrationNumber" inputMode="numeric" placeholder="000-00-00000" className={inputClass} /></label>
      <label className="block text-sm font-bold text-slate-700">대표자명 <span className="font-normal text-slate-400">선택</span><input name="ownerName" maxLength={80} className={inputClass} /></label>
      <label className="block text-sm font-bold text-slate-700">지역 <span className="font-normal text-slate-400">선택</span><input name="region" maxLength={80} placeholder="예: 경남 진주시" className={inputClass} /></label>
      {state.status === "error" && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.message}</p>}
      <button type="submit" disabled={pending} className="h-14 w-full rounded-xl bg-indigo-600 px-4 text-base font-bold text-white disabled:cursor-wait disabled:opacity-60">{pending ? "사업장 만드는 중..." : "사업장 시작하기"}</button>
    </form>
  );
}
