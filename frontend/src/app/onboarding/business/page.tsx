import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth/auth-page";
import { BusinessOnboardingForm } from "@/components/auth/business-onboarding-form";
import { getCurrentBusiness, requireAuthenticatedUser } from "@/lib/auth/current-context";

export default async function BusinessOnboardingPage() {
  await requireAuthenticatedUser();
  if (await getCurrentBusiness()) redirect("/");
  return (
    <AuthPage title="사업장 등록" description="처음 사용할 사업장의 기본 정보를 입력해 주세요.">
      <BusinessOnboardingForm />
    </AuthPage>
  );
}
