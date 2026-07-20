import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";

export default function ForgotPasswordPage() {
  return <AuthPage title="비밀번호 찾기" description="가입한 이메일로 비밀번호 재설정 안내를 보내드립니다." footer={<AuthLink href="/login">로그인으로 돌아가기</AuthLink>}><ForgotPasswordForm /></AuthPage>;
}
