import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyAuthDatabaseError, getSafeDatabaseDiagnostic } from "@/lib/auth/auth-database-error";

test("DB relation 누락과 PostgREST schema cache 누락을 구분한다", () => {
  assert.equal(classifyAuthDatabaseError({ code: "42P01" }), "relation-missing");
  assert.equal(classifyAuthDatabaseError({ code: "PGRST205" }), "relation-missing");
});

test("권한 오류와 RLS 재귀를 구분한다", () => {
  assert.equal(classifyAuthDatabaseError({ code: "42501" }), "permission-denied");
  assert.equal(classifyAuthDatabaseError({ code: "42P17" }), "rls-recursion");
  assert.equal(classifyAuthDatabaseError({ message: "infinite recursion detected in policy" }), "rls-recursion");
});

test("안전 진단은 원문 DB message 대신 code와 분류된 안내만 반환한다", () => {
  assert.deepEqual(getSafeDatabaseDiagnostic({ code: "PGRST205", message: "sensitive raw message" }, "membership"), {
    code: "PGRST205",
    kind: "relation-missing",
    resource: "membership",
    message: "사업장 소속 테이블이 없습니다. Supabase migration 적용이 필요합니다.",
  });
});
