"use client";

import { useActionState } from "react";

import { updateBusinessNameAction } from "@/app/auth/actions";
import { INITIAL_AUTH_STATE } from "@/lib/auth/action-state";

export function BusinessNameForm({ initialName, canEdit }: { initialName: string; canEdit: boolean }) {
  const [state, action, pending] = useActionState(updateBusinessNameAction, INITIAL_AUTH_STATE);
  return (
    <form action={action} className="rounded-2xl border border-slate-200 p-4">
      <label htmlFor="businessName" className="text-sm font-bold text-slate-700">사업장명</label>
      <input id="businessName" name="businessName" defaultValue={initialName} disabled={!canEdit || pending} maxLength={80} className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-base font-semibold outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-500" />
      {state.message && <p role="status" className={`mt-3 text-sm font-semibold ${state.status === "success" ? "text-emerald-700" : "text-rose-600"}`}>{state.message}</p>}
      {canEdit && <button type="submit" disabled={pending} className="mt-4 h-12 w-full rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60">{pending ? "저장 중..." : "사업장명 저장"}</button>}
    </form>
  );
}
