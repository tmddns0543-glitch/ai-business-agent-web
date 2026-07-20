import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";
import { getCurrentUser } from "@/lib/auth/current-context";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) return <AuthPage title="재설정 링크를 확인해 주세요" description="링크가 만료되었거나 복구 세션이 없습니다. 비밀번호 재설정 이메일을 다시 요청해 주세요." footer={<AuthLink href="/forgot-password">재설정 이메일 다시 받기</AuthLink>}><div /></AuthPage>;
  return <AuthPage title="새 비밀번호 설정" description="앞으로 사용할 새 비밀번호를 입력하세요."><ResetPasswordForm /></AuthPage>;
}
