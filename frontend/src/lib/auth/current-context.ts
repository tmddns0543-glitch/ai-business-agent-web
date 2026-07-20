import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/types/database";

export type CurrentBusiness = {
  id: string;
  name: string;
  status: "active" | "archived";
  role: MembershipRole;
};

export type AuthContextErrorCode =
  | "unauthenticated"
  | "business-missing"
  | "permission-denied"
  | "database-error"
  | "configuration-error";

export class AuthContextError extends Error {
  constructor(public readonly code: AuthContextErrorCode, message: string) {
    super(message);
    this.name = "AuthContextError";
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=session-expired");
  return user;
}

async function readCurrentBusiness(userId: string): Promise<CurrentBusiness | null> {
  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("business_memberships")
    .select("business_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    const code = membershipError.code === "42501" ? "permission-denied" : "database-error";
    throw new AuthContextError(code, "사업장 권한을 확인하지 못했습니다.");
  }
  if (!membership) return null;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("id", membership.business_id)
    .maybeSingle();

  if (businessError) {
    const code = businessError.code === "42501" ? "permission-denied" : "database-error";
    throw new AuthContextError(code, "사업장 정보를 불러오지 못했습니다.");
  }
  if (!business) return null;

  return { ...business, role: membership.role };
}

export async function getCurrentBusiness(): Promise<CurrentBusiness | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const existing = await readCurrentBusiness(user.id);
  if (existing) return existing;

  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_current_user_business");
  if (error) throw new AuthContextError("business-missing", "기본 사업장을 준비하지 못했습니다.");
  return readCurrentBusiness(user.id);
}

export async function requireCurrentBusiness(): Promise<CurrentBusiness> {
  await requireAuthenticatedUser();
  const business = await getCurrentBusiness();
  if (!business) throw new AuthContextError("business-missing", "사용할 사업장이 없습니다.");
  return business;
}
