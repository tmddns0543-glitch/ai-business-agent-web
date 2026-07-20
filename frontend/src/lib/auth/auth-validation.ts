export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateSignupInput(email: string, password: string, confirmation: string): string | null {
  if (!email || !password || !confirmation) return "모든 항목을 입력해 주세요.";
  if (!isValidEmail(email)) return "올바른 이메일 주소를 입력해 주세요.";
  if (password.length < 8) return "비밀번호는 8자 이상으로 입력해 주세요.";
  if (password !== confirmation) return "비밀번호 확인이 일치하지 않습니다.";
  return null;
}

export function getSignupErrorMessage(error: { message: string; status?: number }) {
  const message = error.message.toLowerCase();
  if (message.includes("already registered") || message.includes("already been registered")) return "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.";
  if (message.includes("rate limit") || error.status === 429) return "이메일 발송 요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  if (message.includes("password")) return "비밀번호가 Supabase 보안 정책에 맞지 않습니다.";
  return "회원가입을 완료하지 못했습니다. 이메일과 비밀번호를 확인해 주세요.";
}

export function getPostLoginPath(hasCurrentBusiness: boolean, next: string) {
  return hasCurrentBusiness ? next : "/onboarding/business";
}
