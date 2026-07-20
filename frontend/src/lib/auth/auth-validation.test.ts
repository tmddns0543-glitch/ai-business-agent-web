import assert from "node:assert/strict";
import { test } from "node:test";

import { getPostLoginPath, getSignupErrorMessage, validateSignupInput } from "@/lib/auth/auth-validation";

test("회원가입은 이메일 형식과 비밀번호 확인을 검증한다", () => {
  assert.equal(validateSignupInput("invalid", "password1", "password1"), "올바른 이메일 주소를 입력해 주세요.");
  assert.equal(validateSignupInput("owner@example.com", "password1", "different"), "비밀번호 확인이 일치하지 않습니다.");
  assert.equal(validateSignupInput("owner@example.com", "password1", "password1"), null);
});

test("로그인 후 사업장이 없으면 onboarding으로 이동한다", () => {
  assert.equal(getPostLoginPath(false, "/"), "/onboarding/business");
  assert.equal(getPostLoginPath(true, "/closing"), "/closing");
});

test("회원가입 공급자 오류를 사용자 안내로 변환한다", () => {
  assert.match(getSignupErrorMessage({ message: "User already registered" }), /이미 가입/);
  assert.match(getSignupErrorMessage({ message: "rate limit", status: 429 }), /잠시 후/);
});
