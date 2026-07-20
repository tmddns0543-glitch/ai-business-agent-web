import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeBusinessRegistrationNumber, validateBusinessOnboarding } from "@/lib/business/business-onboarding";

test("사업자등록번호는 구분자를 제거해 숫자 10자리로 정규화한다", () => {
  assert.equal(normalizeBusinessRegistrationNumber("123-45-67890"), "1234567890");
});

test("사업장명과 업종은 필수이며 사업자등록번호 형식을 검증한다", () => {
  assert.equal(validateBusinessOnboarding({ name: "", industry: "음식점", registrationNumber: "", ownerName: "", region: "" }).ok, false);
  assert.equal(validateBusinessOnboarding({ name: "가게", industry: "", registrationNumber: "", ownerName: "", region: "" }).ok, false);
  assert.equal(validateBusinessOnboarding({ name: "가게", industry: "음식점", registrationNumber: "123", ownerName: "", region: "" }).ok, false);
});

test("선택값은 null로, 연속 공백은 하나로 정규화한다", () => {
  const result = validateBusinessOnboarding({ name: "  떴다파닭   진주점 ", industry: " 치킨  전문점 ", registrationNumber: "", ownerName: "", region: "" });
  assert.deepEqual(result, { ok: true, data: { name: "떴다파닭 진주점", industry: "치킨 전문점", registrationNumber: null, ownerName: null, region: null } });
});
