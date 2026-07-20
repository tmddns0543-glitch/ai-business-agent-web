import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSafeDatabaseDiagnostic, type AuthDatabaseErrorKind } from "@/lib/auth/auth-database-error";
import type { MembershipRole } from "@/types/database";

export type CurrentBusiness = {
  id: string;
  name: string;
  status: "active" | "archived";
  role: MembershipRole;
};

type MembershipCandidate = { business_id: string; role: MembershipRole };
type BusinessCandidate = { id: string; name: string; status: "active" | "archived" };

export function selectCurrentBusinessFromRows(
  memberships: readonly MembershipCandidate[],
  businesses: readonly BusinessCandidate[],
): CurrentBusiness | null {
  if (!memberships.length || !businesses.length) return null;
  const activeBusinesses = businesses.filter((item) => item.status === "active");
  const activeBusinessIds = new Set(activeBusinesses.map((item) => item.id));
  const membership = memberships.find((item) => item.role === "owner" && activeBusinessIds.has(item.business_id))
    ?? memberships.find((item) => activeBusinessIds.has(item.business_id));
  if (!membership) return null;
  const business = activeBusinesses.find((item) => item.id === membership.business_id);
  return business ? { ...business, role: membership.role } : null;
}

export type AuthContextErrorCode =
  | "unauthenticated"
  | "business-missing"
  | "relation-missing"
  | "permission-denied"
  | "rls-recursion"
  | "database-error"
  | "configuration-error";

export class AuthContextError extends Error {
  constructor(
    public readonly code: AuthContextErrorCode,
    message: string,
    public readonly databaseCode?: string,
  ) {
    super(message);
    this.name = "AuthContextError";
  }
}

function throwDatabaseContextError(error: { code?: string; message?: string }, resource: "membership" | "business"): never {
  const diagnostic = getSafeDatabaseDiagnostic(error, resource);
  if (process.env.NODE_ENV === "development") {
    console.error("[AuthContext]", diagnostic);
  }
  const errorCode: Record<AuthDatabaseErrorKind, AuthContextErrorCode> = {
    "relation-missing": "relation-missing",
    "permission-denied": "permission-denied",
    "rls-recursion": "rls-recursion",
    "database-error": "database-error",
  };
  throw new AuthContextError(errorCode[diagnostic.kind], diagnostic.message, diagnostic.code);
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
  const { data: memberships, error: membershipError } = await supabase
    .from("business_memberships")
    .select("business_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipError) {
    throwDatabaseContextError(membershipError, "membership");
  }
  if (!memberships?.length) return null;

  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("status", "active")
    .in("id", memberships.map((item) => item.business_id));

  if (businessError) {
    throwDatabaseContextError(businessError, "business");
  }
  return selectCurrentBusinessFromRows(memberships, businesses ?? []);
}

export async function getCurrentBusiness(): Promise<CurrentBusiness | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return readCurrentBusiness(user.id);
}

export async function requireCurrentBusiness(): Promise<CurrentBusiness> {
  await requireAuthenticatedUser();
  const business = await getCurrentBusiness();
  if (!business) throw new AuthContextError("business-missing", "사용할 사업장이 없습니다.");
  return business;
}
