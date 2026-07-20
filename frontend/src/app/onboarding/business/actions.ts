"use server";

import { redirect } from "next/navigation";

import type { AuthActionState } from "@/lib/auth/action-state";
import { requireAuthenticatedUser, getCurrentBusiness } from "@/lib/auth/current-context";
import { validateBusinessOnboarding } from "@/lib/business/business-onboarding";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function createInitialBusinessAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  await requireAuthenticatedUser();
  if (await getCurrentBusiness()) redirect("/");

  const validation = validateBusinessOnboarding({
    name: readText(formData, "businessName"),
    industry: readText(formData, "industry"),
    registrationNumber: readText(formData, "registrationNumber"),
    ownerName: readText(formData, "ownerName"),
    region: readText(formData, "region"),
  });
  if (!validation.ok) return { status: "error", message: validation.message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_initial_business", {
    business_name: validation.data.name,
    business_industry: validation.data.industry,
    registration_number: validation.data.registrationNumber,
    representative_name: validation.data.ownerName,
    business_region: validation.data.region,
  });
  if (error || !data) return { status: "error", message: "사업장을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  redirect("/");
}
