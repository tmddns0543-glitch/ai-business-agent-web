"use client";

import { useActionState } from "react";

import { AuthField } from "@/components/auth/auth-page";
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  signupAction,
} from "@/app/auth/actions";
import { INITIAL_AUTH_STATE, type AuthActionState } from "@/lib/auth/action-state";

function StatusMessage({ state }: { state: AuthActionState }) {
  if (state.status === "idle") return null;
  return <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>;
}

function SubmitButton({ pending, idle, loading }: { pending: boolean; idle: string; loading: string }) {
  return <button type="submit" disabled={pending} className="h-14 w-full rounded-xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{pending ? loading : idle}</button>;
}

export function LoginForm({ next, initialMessage = "" }: { next: string; initialMessage?: string }) {
  const initial: AuthActionState = initialMessage ? { status: "success", message: initialMessage } : INITIAL_AUTH_STATE;
  const [state, action, pending] = useActionState(loginAction, initial);
  return <form action={action} className="space-y-5"><input type="hidden" name="next" value={next} /><AuthField id="login-email" name="email" label="이메일" type="email" autoComplete="email" /><AuthField id="login-password" name="password" label="비밀번호" type="password" autoComplete="current-password" /><StatusMessage state={state} /><SubmitButton pending={pending} idle="로그인" loading="로그인 중..." /></form>;
}

export function SignupForm({ isConfigured = true }: { isConfigured?: boolean }) {
  const [state, action, pending] = useActionState(signupAction, INITIAL_AUTH_STATE);
  return <form action={action} className="space-y-5"><AuthField id="signup-email" name="email" label="이메일" type="email" autoComplete="email" /><AuthField id="signup-password" name="password" label="비밀번호" type="password" autoComplete="new-password" /><AuthField id="signup-password-confirmation" name="passwordConfirmation" label="비밀번호 확인" type="password" autoComplete="new-password" /><p className="text-xs leading-5 text-slate-500">비밀번호는 8자 이상으로 입력하세요. 실제 허용 조건은 Supabase 프로젝트의 비밀번호 정책을 따릅니다.</p>{!isConfigured && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">Supabase 환경변수가 설정되지 않았습니다.<br /><code className="text-xs">frontend/.env.local</code>의 공개 URL과 publishable key를 설정한 뒤 개발 서버를 재시작해 주세요.</p>}<StatusMessage state={state} /><button type="submit" disabled={pending || !isConfigured} className="h-14 w-full rounded-xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "가입 처리 중..." : "회원가입"}</button></form>;
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, INITIAL_AUTH_STATE);
  return <form action={action} className="space-y-5"><AuthField id="forgot-email" name="email" label="이메일" type="email" autoComplete="email" /><StatusMessage state={state} /><SubmitButton pending={pending} idle="재설정 안내 받기" loading="요청 중..." /></form>;
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL_AUTH_STATE);
  return <form action={action} className="space-y-5"><AuthField id="reset-password" name="password" label="새 비밀번호" type="password" autoComplete="new-password" /><AuthField id="reset-password-confirmation" name="passwordConfirmation" label="새 비밀번호 확인" type="password" autoComplete="new-password" /><StatusMessage state={state} /><SubmitButton pending={pending} idle="비밀번호 변경" loading="변경 중..." /></form>;
}
