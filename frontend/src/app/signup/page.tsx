import { SignupForm } from "@/components/auth/auth-forms";
import { AuthLink, AuthPage } from "@/components/auth/auth-page";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SignupPage() {
  return <AuthPage title="회원가입" description="이메일 계정을 만든 뒤 사업장 정보를 등록합니다." footer={<>이미 계정이 있나요? <AuthLink href="/login">로그인</AuthLink></>}><SignupForm isConfigured={isSupabaseConfigured()} /></AuthPage>;
}
