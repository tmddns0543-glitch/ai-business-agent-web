import { SignupForm } from "@/components/auth/auth-forms";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";

export default function SignupPage() {
  return <AuthPage title="회원가입" description="이메일 계정과 기본 사업장을 만듭니다." footer={<>이미 계정이 있나요? <AuthLink href="/login">로그인</AuthLink></>}><SignupForm /></AuthPage>;
}
