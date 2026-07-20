import assert from "node:assert/strict";
import { test } from "node:test";

import { inspectSupabaseConfig } from "@/lib/supabase/config";

test("Supabase 공개 설정의 누락과 placeholder를 구분한다", () => {
  assert.deepEqual(inspectSupabaseConfig(undefined, undefined), { configured: false, reason: "missing-url" });
  assert.deepEqual(inspectSupabaseConfig("https://project.supabase.co", ""), { configured: false, reason: "missing-key" });
  assert.deepEqual(inspectSupabaseConfig("https://YOUR_PROJECT_REF.supabase.co", "YOUR_KEY"), { configured: false, reason: "placeholder" });
  assert.deepEqual(inspectSupabaseConfig("PASTE_SUPABASE_PROJECT_URL_HERE", "PASTE_SUPABASE_PUBLISHABLE_KEY_HERE"), { configured: false, reason: "placeholder" });
});

test("HTTPS 프로젝트 URL과 로컬 Supabase URL만 허용한다", () => {
  assert.deepEqual(inspectSupabaseConfig("not-a-url", "sb_publishable_test"), { configured: false, reason: "invalid-url" });
  assert.deepEqual(inspectSupabaseConfig("https://project.supabase.co", "sb_publishable_test"), { configured: true });
  assert.deepEqual(inspectSupabaseConfig("http://localhost:54321", "local-anon-key"), { configured: true });
});
