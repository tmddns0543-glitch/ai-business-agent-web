export type AuthDatabaseErrorKind =
  | "relation-missing"
  | "permission-denied"
  | "rls-recursion"
  | "database-error";

export type DatabaseErrorLike = {
  code?: string;
  message?: string;
};

export function classifyAuthDatabaseError(error: DatabaseErrorLike): AuthDatabaseErrorKind {
  if (error.code === "42P01" || error.code === "PGRST205") return "relation-missing";
  if (error.code === "42501") return "permission-denied";
  if (error.code === "42P17" || error.message?.toLowerCase().includes("infinite recursion")) return "rls-recursion";
  return "database-error";
}

export function getAuthDatabaseErrorMessage(kind: AuthDatabaseErrorKind, resource: "membership" | "business") {
  const label = resource === "membership" ? "사업장 소속" : "사업장";
  if (kind === "relation-missing") return `${label} 테이블이 없습니다. Supabase migration 적용이 필요합니다.`;
  if (kind === "permission-denied") return `${label} 조회 권한이 없습니다. RLS 정책을 확인해 주세요.`;
  if (kind === "rls-recursion") return `${label} RLS 정책에서 재귀 오류가 발생했습니다.`;
  return `${label} 정보를 확인하지 못했습니다.`;
}

export function getSafeDatabaseDiagnostic(error: DatabaseErrorLike, resource: "membership" | "business") {
  const kind = classifyAuthDatabaseError(error);
  return {
    code: error.code ?? "unknown",
    kind,
    resource,
    message: getAuthDatabaseErrorMessage(kind, resource),
  };
}
