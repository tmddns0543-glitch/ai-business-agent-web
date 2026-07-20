import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { BUSINESS_DAY_SALES_STORAGE_KEY } from "@/lib/storage/sales-by-business-day-storage";
import { LocalStorageSalesRepository, readLocalSalesImportCandidates } from "@/repositories/sales/local-storage-sales-repository";
import { createLocalSale, dbRowToSale, platformSnapshotToSales, salesToStoredSales } from "@/repositories/sales/sales-mapper";
import type { SalesRepository } from "@/repositories/sales/sales-repository";
import { SalesRepositoryError, type CreateSaleInput, type Sale } from "@/repositories/sales/sales-types";
import { importSalesCandidates } from "@/services/sales/import-local-sales-to-supabase";
import { SETTLEMENT_CHANNEL_IDS } from "@/types/settlement";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });

beforeEach(() => storage.clear());

test("LocalStorage Repository는 플랫폼 snapshot을 생성·수정하고 날짜와 월별로 분리한다", async () => {
  const repository = new LocalStorageSalesRepository();
  await repository.savePlatformSnapshot("2026-06-30", "coupang-eats", { sales: 100000, orders: 10 });
  await repository.savePlatformSnapshot("2026-07-01", "general", { card: 50000, cash: 10000, bankTransfer: 5000 });
  assert.equal((await repository.getPlatformSnapshot("2026-06-30", "coupang-eats")).sales, 100000);
  assert.equal((await repository.getByMonth("2026-06")).length, 1);
  assert.equal((await repository.getByMonth("2026-07")).length, 3);
  await repository.savePlatformSnapshot("2026-06-30", "coupang-eats", { sales: 120000, orders: 11 });
  assert.equal((await repository.getPlatformSnapshot("2026-06-30", "coupang-eats")).sales, 120000);
  await repository.removeByDate("2026-06-30");
  assert.equal((await repository.getByDate("2026-06-30")).length, 0);
  assert.equal((await repository.getByDate("2026-07-01")).length, 3);
});

test("LocalStorage JSON 손상을 빈 배열로 숨기지 않는다", async () => {
  storage.setItem(BUSINESS_DAY_SALES_STORAGE_KEY, "{broken");
  await assert.rejects(() => new LocalStorageSalesRepository().getAllForBusiness(), SalesRepositoryError);
});

test("플랫폼 snapshot과 도메인 매출 매핑은 주문 수와 nullable 필드를 보존한다", () => {
  const rows = platformSnapshotToSales("2026-07-01", "baemin", { prepaid: 10000, card: 20000, cash: 30000, baeminOne: 40000, baeminOneOrders: 4 }).map(createLocalSale);
  const stored = salesToStoredSales(rows);
  assert.deepEqual(stored.baemin, { prepaid: 10000, card: 20000, cash: 30000, baeminOne: 40000, baeminOneOrders: 4 });
  const mapped = dbRowToSale({
    id: "550e8400-e29b-41d4-a716-446655440000", business_id: "business", business_date: "2026-07-01", platform: "general",
    channel: SETTLEMENT_CHANNEL_IDS.GENERAL_CASH, payment_method: "cash", amount: 9000, order_count: null, memo: null,
    source: "app", source_record_id: null, import_key: null, created_by: "user", created_at: "2026-07-01T00:00:00.000Z", updated_at: "2026-07-01T00:00:00.000Z",
  });
  assert.equal(mapped.orderCount, null);
  assert.equal(mapped.memo, null);
});

test("가져오기는 중복을 건너뛰고 원본 객체를 변경하지 않는다", async () => {
  const source = createLocalSale(platformSnapshotToSales("2026-07-01", "ddangyo", { prepaid: 30000 }, "local-import")[0]);
  const remoteRows: Sale[] = [];
  const remote = {
    async getAllForBusiness() { return [...remoteRows]; },
    async create(input: CreateSaleInput) {
      if (remoteRows.some((row) => row.importKey === input.importKey)) throw new SalesRepositoryError("CONFLICT", "duplicate");
      const row = createLocalSale(input); remoteRows.push(row); return row;
    },
  } as SalesRepository;
  const first = await importSalesCandidates([source], [], remote);
  const second = await importSalesCandidates([source], [], remote);
  assert.deepEqual({ imported: first.imported, skipped: first.skipped }, { imported: 1, skipped: 0 });
  assert.deepEqual({ imported: second.imported, skipped: second.skipped }, { imported: 0, skipped: 1 });
  assert.equal(source.source, "local-import");
});

test("가져오기는 사전 검증 실패와 저장 실패를 개별 집계한다", async () => {
  const source = createLocalSale(platformSnapshotToSales("2026-07-02", "ddangyo", { prepaid: 30000 }, "local-import")[0]);
  const remote = {
    async getAllForBusiness() { return []; },
    async create() { throw new SalesRepositoryError("NETWORK", "network"); },
  } as unknown as SalesRepository;
  const result = await importSalesCandidates([source], [{ recordId: "broken", message: "invalid" }], remote);
  assert.equal(result.total, 2);
  assert.equal(result.failed, 2);
  assert.equal(result.errors.length, 2);
});

test("2026년 6월 가져오기 후보는 5월과 7월 데이터를 제외한다", () => {
  storage.setItem(BUSINESS_DAY_SALES_STORAGE_KEY, JSON.stringify({
    version: 1,
    days: {
      "2026-05-31": { ddangyo: { prepaid: 1000 } },
      "2026-06-01": { ddangyo: { prepaid: 2000 } },
      "2026-06-30": { general: { card: 3000, cash: 0, bankTransfer: 0 } },
      "2026-07-01": { ddangyo: { prepaid: 4000 } },
    },
  }));
  const candidates = readLocalSalesImportCandidates({ startDate: "2026-06-01", endDate: "2026-06-30" });
  assert.deepEqual([...new Set(candidates.sales.map((sale) => sale.businessDate))], ["2026-06-01", "2026-06-30"]);
  assert.equal(candidates.errors.length, 0);
});
