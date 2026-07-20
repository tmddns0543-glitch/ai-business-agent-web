"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { AuthContextError, getCurrentBusiness, requireAuthenticatedUser, requireCurrentBusiness } from "@/lib/auth/current-context";
import type { AuthActionState } from "@/lib/auth/action-state";
import { getPostLoginPath, getSignupErrorMessage, isValidEmail, validateSignupInput } from "@/lib/auth/auth-validation";
import { SupabaseConfigurationError } from "@/lib/supabase/config";
import { getSafeInternalPath } from "@/lib/supabase/safe-redirect";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

function configurationState(): AuthActionState {
  return {
    status: "error",
    message: process.env.NODE_ENV === "development"
      ? "Supabase 환경변수가 설정되지 않았습니다. frontend/.env.local의 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해 주세요."
      : "로그인 서비스 설정이 필요합니다. 관리자에게 문의해 주세요.",
  };
}

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const next = getSafeInternalPath(readText(formData, "next"));
  if (!email || !password) return { status: "error", message: "이메일과 비밀번호를 입력해 주세요." };
  if (!isValidEmail(email)) return { status: "error", message: "올바른 이메일 주소를 입력해 주세요." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: "error", message: "이메일 또는 비밀번호를 확인해 주세요." };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return configurationState();
    return { status: "error", message: "로그인 중 연결 오류가 발생했습니다. 다시 시도해 주세요." };
  }
  let business;
  try {
    business = await getCurrentBusiness();
  } catch (error) {
    if (error instanceof AuthContextError) {
      return {
        status: "error",
        message: process.env.NODE_ENV === "development" && error.databaseCode
          ? `${error.message} (DB code: ${error.databaseCode})`
          : "사업장 정보를 확인하지 못했습니다. 관리자에게 문의해 주세요.",
      };
    }
    return { status: "error", message: "사업장 정보를 확인하는 중 오류가 발생했습니다." };
  }
  redirect(getPostLoginPath(Boolean(business), next));
}

export async function signupAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readText(formData, "email");
  const password = readText(formData, "password");
  const confirmation = readText(formData, "passwordConfirmation");
  const validationError = validateSignupInput(email, password, confirmation);
  if (validationError) return { status: "error", message: validationError };

  let hasSession = false;
  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding/business` },
    });
    if (error) return { status: "error", message: getSignupErrorMessage(error) };
    hasSession = Boolean(data.session);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return configurationState();
    return { status: "error", message: "회원가입 중 연결 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (hasSession) redirect("/onboarding/business");
  return { status: "success", message: "가입 확인 이메일을 보냈습니다. 이메일에서 인증을 완료한 뒤 로그인해 주세요." };
}

export async function forgotPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readText(formData, "email");
  if (!email) return { status: "error", message: "이메일을 입력해 주세요." };
  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
    return { status: "success", message: "입력한 이메일로 재설정 안내를 보냈습니다. 등록 여부와 관계없이 이메일을 확인해 주세요." };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return configurationState();
    return { status: "error", message: "요청 중 연결 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = readText(formData, "password");
  const confirmation = readText(formData, "passwordConfirmation");
  if (password.length < 8) return { status: "error", message: "비밀번호는 8자 이상으로 입력해 주세요." };
  if (password !== confirmation) return { status: "error", message: "비밀번호 확인이 일치하지 않습니다." };
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { status: "error", message: "비밀번호를 변경하지 못했습니다. 재설정 링크를 다시 요청해 주세요." };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) return configurationState();
    return { status: "error", message: "재설정 링크가 만료되었거나 유효하지 않습니다." };
  }
  redirect("/login?message=password-updated");
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login");
  }
}

export async function updateBusinessNameAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const name = readText(formData, "businessName").replace(/\s+/g, " ");
  if (!name || name.length > 80) return { status: "error", message: "사업장명은 1자 이상 80자 이하로 입력해 주세요." };
  try {
    const user = await requireAuthenticatedUser();
    const business = await requireCurrentBusiness();
    if (business.role !== "owner") return { status: "error", message: "사업장명을 수정할 권한이 없습니다." };
    const supabase = await createClient();
    const { error } = await supabase.from("businesses").update({ name }).eq("id", business.id).eq("owner_user_id", user.id);
    if (error) return { status: "error", message: "사업장명을 저장하지 못했습니다." };
    revalidatePath("/more");
    revalidatePath("/more/store");
    return { status: "success", message: "사업장명을 저장했습니다." };
  } catch {
    return { status: "error", message: "사업장 정보를 확인하지 못했습니다. 다시 로그인해 주세요." };
  }
}
