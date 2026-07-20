import { LoginForm } from "@/components/auth/auth-forms";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";
import { getSafeInternalPath } from "@/lib/supabase/safe-redirect";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; message?: string }> }) {
  const params = await searchParams;
  const message = params.message === "password-updated" ? "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요." : params.error ? "인증 링크가 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요." : "";
  return <AuthPage title="로그인" description="가게의 하루 운영 기록을 안전하게 이어가세요." footer={<><AuthLink href="/signup">회원가입</AuthLink><span className="mx-2">·</span><AuthLink href="/forgot-password">비밀번호 찾기</AuthLink></>}><LoginForm next={getSafeInternalPath(params.next ?? null)} initialMessage={message} /></AuthPage>;
}
