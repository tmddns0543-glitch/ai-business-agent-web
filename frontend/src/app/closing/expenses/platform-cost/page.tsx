"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CustomExpenseItemManager } from "@/components/expenses/custom-expense-item-manager";
import { calculateExpenseSummary } from "@/lib/expense/calculate-expense-summary";
import {
  calculatePlatformCostInputSummary,
  type PlatformCostInputValues,
} from "@/lib/expense/calculate-platform-cost-input-summary";
import { createExpenseTransactionId } from "@/lib/expense/create-expense-transaction-id";
import { getExpenseItemsForGroup } from "@/lib/expense/expense-item-catalog";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { setExpenseUnconfirmed } from "@/lib/storage/closing-status-by-business-day-storage";
import {
  getExpensesByBusinessDateAndGroup,
  replaceExpenseTransactionsByGroup,
} from "@/lib/storage/expense-by-business-day-storage";
import {
  formatBusinessDate,
  type BusinessDate,
} from "@/types/business-day";
import type {
  ExpenseItemId,
  ExpensePlatformId,
  ExpenseTransaction,
} from "@/types/expense";
import type { ExpenseCatalogItem } from "@/types/expense-storage";

const PLATFORMS: readonly {
  id: ExpensePlatformId;
  label: string;
}[] = [
  { id: "baemin", label: "배달의민족" },
  { id: "coupang-eats", label: "쿠팡이츠" },
  { id: "yogiyo", label: "요기요" },
  { id: "ddangyo", label: "땡겨요" },
];

type ExistingCombination = {
  representative: ExpenseTransaction;
  amount: number;
  count: number;
};

function formatMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${safeValue.toLocaleString("ko-KR")}원`;
}

function createEmptyPlatformValues(): Record<ExpensePlatformId, number> {
  return {
    baemin: 0,
    "coupang-eats": 0,
    yogiyo: 0,
    ddangyo: 0,
  };
}

function createCombinationKey(itemId: string, platformId: ExpensePlatformId) {
  return `${itemId}::${platformId}`;
}

function createEditableItems(
  transactions: readonly ExpenseTransaction[],
): ExpenseCatalogItem[] {
  const catalog = getExpenseItemsForGroup("platform-cost");
  const knownIds = new Set(catalog.map(({ id }) => id));
  const historicalItems: ExpenseCatalogItem[] = [];

  transactions.forEach((transaction) => {
    if (
      transaction.transactionType !== "expense" ||
      !transaction.platformId ||
      knownIds.has(transaction.itemId)
    ) {
      return;
    }

    knownIds.add(transaction.itemId);
    historicalItems.push({
      id: transaction.itemId,
      group: "platform-cost",
      label: transaction.itemName,
      system: false,
      enabled: false,
    });
  });

  return [...catalog, ...historicalItems].map((item) => ({ ...item }));
}

function createExistingCombinations(
  transactions: readonly ExpenseTransaction[],
  editableItemIds: ReadonlySet<string>,
) {
  const combinations = new Map<string, ExistingCombination>();

  transactions.forEach((transaction) => {
    if (
      transaction.transactionType !== "expense" ||
      !transaction.platformId ||
      !editableItemIds.has(transaction.itemId)
    ) {
      return;
    }

    const key = createCombinationKey(
      transaction.itemId,
      transaction.platformId,
    );
    const existing = combinations.get(key);

    if (existing) {
      combinations.set(key, {
        ...existing,
        amount: existing.amount + transaction.amount,
        count: existing.count + 1,
      });
      return;
    }

    combinations.set(key, {
      representative: { ...transaction },
      amount: transaction.amount,
      count: 1,
    });
  });

  return combinations;
}

function createInputValues(
  items: readonly ExpenseCatalogItem[],
  combinations: ReadonlyMap<string, ExistingCombination>,
): PlatformCostInputValues {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      Object.fromEntries(
        PLATFORMS.map((platform) => [
          platform.id,
          combinations.get(createCombinationKey(item.id, platform.id))
            ?.amount ?? 0,
        ]),
      ) as Record<ExpensePlatformId, number>,
    ]),
  );
}

function getManagedSignature(
  transactions: readonly ExpenseTransaction[],
  editableItemIds: ReadonlySet<string>,
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.transactionType === "expense" &&
        transaction.platformId &&
        editableItemIds.has(transaction.itemId),
    )
    .map((transaction) =>
      [
        transaction.id,
        transaction.itemId,
        transaction.platformId,
        transaction.amount,
      ].join("|"),
    )
    .sort()
    .join("::");
}

export default function PlatformCostPage() {
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [items, setItems] = useState<ExpenseCatalogItem[]>([]);
  const [values, setValues] = useState<PlatformCostInputValues>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const selectedBusinessDate = getSelectedBusinessDate();
    const savedTransactions = getExpensesByBusinessDateAndGroup(
      selectedBusinessDate,
      "platform-cost",
    );
    const editableItems = createEditableItems(savedTransactions);
    const combinations = createExistingCombinations(
      savedTransactions,
      new Set(editableItems.map(({ id }) => id)),
    );

    setBusinessDate(selectedBusinessDate);
    setTransactions(savedTransactions);
    setItems(editableItems);
    setValues(createInputValues(editableItems, combinations));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const inputSummary = useMemo(
    () => calculatePlatformCostInputSummary(values),
    [values],
  );
  const storedSummary = useMemo(
    () => calculateExpenseSummary(transactions),
    [transactions],
  );

  function reload(date: BusinessDate) {
    const savedTransactions = getExpensesByBusinessDateAndGroup(
      date,
      "platform-cost",
    );
    const editableItems = createEditableItems(savedTransactions);
    const combinations = createExistingCombinations(
      savedTransactions,
      new Set(editableItems.map(({ id }) => id)),
    );

    setTransactions(savedTransactions);
    setItems(editableItems);
    setValues(createInputValues(editableItems, combinations));
  }

  function refreshCatalog() {
    const editableItems = createEditableItems(transactions);
    const combinations = createExistingCombinations(
      transactions,
      new Set(editableItems.map(({ id }) => id)),
    );

    setItems(editableItems);
    setValues((current) =>
      Object.fromEntries(
        editableItems.map((item) => [
          item.id,
          Object.fromEntries(
            PLATFORMS.map((platform) => [
              platform.id,
              current[item.id]?.[platform.id] ??
                combinations.get(
                  createCombinationKey(item.id, platform.id),
                )?.amount ??
                0,
            ]),
          ) as Record<ExpensePlatformId, number>,
        ]),
      ),
    );
  }

  function updateAmount(
    itemId: string,
    platformId: ExpensePlatformId,
    rawValue: string,
  ) {
    if (rawValue.includes("-")) {
      setError("금액은 0원 이상으로 입력해주세요.");
      return;
    }

    const digits = rawValue.replace(/\D/g, "");
    const amount = digits ? Number(digits) : 0;

    if (!Number.isFinite(amount)) {
      setError("올바른 금액을 입력해주세요.");
      return;
    }

    setValues((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] ?? createEmptyPlatformValues()),
        [platformId]: amount,
      },
    }));
    setMessage(null);
    setError(null);
  }

  function savePlatformCosts() {
    if (!businessDate || isSaving) {
      return;
    }

    const editableItemIds = new Set(items.map(({ id }) => id));
    const existingCombinations = createExistingCombinations(
      transactions,
      editableItemIds,
    );
    const now = new Date().toISOString();
    const nextManagedTransactions: ExpenseTransaction[] = [];

    items.forEach((item) => {
      PLATFORMS.forEach((platform) => {
        const amount = values[item.id]?.[platform.id] ?? 0;

        if (!Number.isFinite(amount) || amount < 0) {
          return;
        }

        if (amount === 0) {
          return;
        }

        const existing = existingCombinations.get(
          createCombinationKey(item.id, platform.id),
        );

        if (existing && existing.amount === amount && existing.count === 1) {
          nextManagedTransactions.push({ ...existing.representative });
          return;
        }

        nextManagedTransactions.push({
          id: existing?.representative.id ?? createExpenseTransactionId(),
          businessDate,
          group: "platform-cost",
          itemId: item.id as ExpenseItemId,
          itemName: item.label,
          amount,
          transactionType: "expense",
          platformId: platform.id,
          createdAt: existing?.representative.createdAt ?? now,
          updatedAt: now,
        });
      });
    });

    const preservedTransactions = transactions
      .filter(
        (transaction) =>
          transaction.transactionType !== "expense" ||
          !transaction.platformId ||
          !editableItemIds.has(transaction.itemId),
      )
      .map((transaction) => ({ ...transaction }));
    const nextTransactions = [
      ...preservedTransactions,
      ...nextManagedTransactions,
    ];
    const currentSignature = getManagedSignature(
      transactions,
      editableItemIds,
    );
    const nextSignature = getManagedSignature(
      nextTransactions,
      editableItemIds,
    );

    if (currentSignature === nextSignature) {
      setMessage("변경된 내용이 없습니다.");
      setError(null);
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    if (
      replaceExpenseTransactionsByGroup(
        businessDate,
        "platform-cost",
        nextTransactions,
      )
    ) {
      setExpenseUnconfirmed(businessDate);
      reload(businessDate);
      setMessage("플랫폼 비용을 저장했습니다.");
    } else {
      setError("플랫폼 비용을 저장하지 못했습니다. 다시 시도해주세요.");
    }

    setIsSaving(false);
  }

  if (!businessDate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          플랫폼 비용을 불러오고 있어요.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-3">
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] max-w-md rounded-2xl bg-white px-4 pb-12 pt-4 shadow-sm">
        <header>
          <Link
            href="/closing/expenses"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-700 transition hover:bg-slate-100"
            aria-label="비용 화면으로 돌아가기"
          >
            ‹
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            플랫폼 비용
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {formatBusinessDate(businessDate)} 영업일
          </p>
        </header>

        <section className="mt-5 rounded-xl bg-indigo-50 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-indigo-500">
                총 플랫폼 비용
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-700">
                {formatMoney(storedSummary.byGroup["platform-cost"])}
              </p>
            </div>
            <span className="text-sm font-bold text-indigo-600">
              {storedSummary.transactionCount}건
            </span>
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 px-4 py-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {item.label}
                  </h2>
                  {!item.enabled && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      비활성 과거 항목
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-700">
                  {formatMoney(inputSummary.byItem[item.id] ?? 0)}
                </span>
              </div>

              <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
                {PLATFORMS.map((platform) => {
                  const amount = values[item.id]?.[platform.id] ?? 0;

                  return (
                    <label
                      key={platform.id}
                      className="flex min-h-13 items-center gap-3 py-2"
                    >
                      <span className="w-24 shrink-0 text-sm text-slate-600">
                        {platform.label}
                      </span>
                      <div className="flex min-w-0 flex-1 items-center rounded-lg bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-indigo-100">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            amount === 0
                              ? ""
                              : amount.toLocaleString("ko-KR")
                          }
                          onChange={(event) =>
                            updateAmount(
                              item.id,
                              platform.id,
                              event.target.value,
                            )
                          }
                          placeholder="0"
                          className="min-w-0 flex-1 bg-transparent py-3 text-right text-base font-bold text-slate-900 outline-none"
                        />
                        <span className="ml-1.5 text-xs text-slate-500">
                          원
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </section>

        <CustomExpenseItemManager
          group="platform-cost"
          groupLabel="플랫폼 비용"
          onChanged={refreshCatalog}
        />

        <section className="mt-5 rounded-xl bg-slate-50 p-4">
          <h2 className="text-sm font-bold text-slate-800">입력 요약</h2>

          <div className="mt-3 space-y-2 text-sm">
            {PLATFORMS.map((platform) => (
              <div
                key={platform.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-slate-500">{platform.label}</span>
                <span className="font-semibold text-slate-800">
                  {formatMoney(inputSummary.byPlatform[platform.id])}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="font-bold text-slate-800">
              플랫폼 비용 합계
            </span>
            <span className="text-xl font-bold text-indigo-600">
              {formatMoney(inputSummary.total)}
            </span>
          </div>
        </section>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          0원으로 저장하면 해당 플랫폼 비용 기록이 삭제됩니다.
          환급·취소 거래는 유지되며 합계에만 반영됩니다.
        </p>

        {error && (
          <p className="mt-3 text-sm leading-5 text-rose-600">{error}</p>
        )}
        {message && (
          <p className="mt-3 text-sm leading-5 text-emerald-600">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={savePlatformCosts}
          disabled={isSaving}
          className="mt-5 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-wait disabled:bg-indigo-400"
        >
          {isSaving ? "저장 중..." : "플랫폼 비용 저장"}
        </button>
      </div>
    </main>
  );
}
