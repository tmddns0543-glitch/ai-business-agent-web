import assert from "node:assert/strict";
import { test } from "node:test";

import { selectCurrentBusinessFromRows } from "@/lib/auth/current-context";

test("membership 0건은 오류가 아닌 null이다", () => {
  assert.equal(selectCurrentBusinessFromRows([], []), null);
});

test("active owner 사업장을 현재 사업장으로 우선 선택한다", () => {
  const result = selectCurrentBusinessFromRows(
    [{ business_id: "staff-business", role: "staff" }, { business_id: "owner-business", role: "owner" }],
    [{ id: "staff-business", name: "직원 가게", status: "active" }, { id: "owner-business", name: "내 가게", status: "active" }],
  );
  assert.deepEqual(result, { id: "owner-business", name: "내 가게", status: "active", role: "owner" });
});

test("archived business membership만 있으면 null이다", () => {
  assert.equal(selectCurrentBusinessFromRows(
    [{ business_id: "archived", role: "owner" }],
    [{ id: "archived", name: "종료 가게", status: "archived" }],
  ), null);
});
