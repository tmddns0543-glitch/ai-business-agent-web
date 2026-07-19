"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CustomExpenseItemManager } from "@/components/expenses/custom-expense-item-manager";
import {
  calculateTaxPaymentInputSummary,
  type TaxPaymentInputValues,
} from "@/lib/expense/calculate-tax-payment-input-summary";
import { calculateExpenseSummary } from "@/lib/expense/calculate-expense-summary";
import { createExpenseTransactionId } from "@/lib/expense/create-expense-transaction-id";
import { getExpenseItemsForGroup } from "@/lib/expense/expense-item-catalog";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { setExpenseUnconfirmed } from "@/lib/storage/closing-status-by-business-day-storage";
import { getExpenseCustomItemsByGroup } from "@/lib/storage/expense-custom-items-storage";
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
  ExpenseTransaction,
} from "@/types/expense";
import type { ExpenseCatalogItem } from "@/types/expense-storage";

type ExistingItem = {
  representative: ExpenseTransaction;
  amount: number;
  count: number;
};

function formatMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${safeValue.toLocaleString("ko-KR")}원`;
}

function createEditableItems(
  transactions: readonly ExpenseTransaction[],
): ExpenseCatalogItem[] {
  const activeItems = getExpenseItemsForGroup("tax-payment");
  const allCustomItems = getExpenseCustomItemsByGroup("tax-payment", {
    includeDisabled: true,
  });
  const activeIds = new Set(activeItems.map(({ id }) => id));
  const transactionIds = new Set<string>(
    transactions
      .filter(({ transactionType }) => transactionType === "expense")
      .map(({ itemId }) => itemId),
  );
  const inactiveHistoricalItems = allCustomItems
    .filter((item) => !item.enabled && transactionIds.has(item.id))
    .filter((item) => !activeIds.has(item.id))
    .map<ExpenseCatalogItem>((item) => ({
      id: item.id,
      group: item.group,
      label: item.name,
      system: false,
      enabled: false,
    }));

  return [...activeItems, ...inactiveHistoricalItems].map((item) => ({
    ...item,
  }));
}

function createExistingItems(
  transactions: readonly ExpenseTransaction[],
  editableItemIds: ReadonlySet<string>,
) {
  const existingItems = new Map<string, ExistingItem>();

  transactions.forEach((transaction) => {
    if (
      transaction.transactionType !== "expense" ||
      !editableItemIds.has(transaction.itemId)
    ) {
      return;
    }

    const existing = existingItems.get(transaction.itemId);

    if (existing) {
      existingItems.set(transaction.itemId, {
        ...existing,
        amount: existing.amount + transaction.amount,
        count: existing.count + 1,
      });
      return;
    }

    existingItems.set(transaction.itemId, {
      representative: { ...transaction },
      amount: transaction.amount,
      count: 1,
    });
  });

  return existingItems;
}

function createInputValues(
  items: readonly ExpenseCatalogItem[],
  existingItems: ReadonlyMap<string, ExistingItem>,
): TaxPaymentInputValues {
  return Object.fromEntries(
    items.map((item) => [item.id, existingItems.get(item.id)?.amount ?? 0]),
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
        editableItemIds.has(transaction.itemId),
    )
    .map((transaction) =>
      [transaction.id, transaction.itemId, transaction.amount].join("|"),
    )
    .sort()
    .join("::");
}

export default function TaxPaymentPage() {
  const router = useRouter();
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [items, setItems] = useState<ExpenseCatalogItem[]>([]);
  const [values, setValues] = useState<TaxPaymentInputValues>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const selectedBusinessDate = getSelectedBusinessDate();
    const savedTransactions = getExpensesByBusinessDateAndGroup(
      selectedBusinessDate,
      "tax-payment",
    );
    const editableItems = createEditableItems(savedTransactions);
    const existingItems = createExistingItems(
      savedTransactions,
      new Set(editableItems.map(({ id }) => id)),
    );

    setBusinessDate(selectedBusinessDate);
    setTransactions(savedTransactions);
    setItems(editableItems);
    setValues(createInputValues(editableItems, existingItems));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const inputTotal = useMemo(
    () => calculateTaxPaymentInputSummary(values),
    [values],
  );
  const storedSummary = useMemo(
    () => calculateExpenseSummary(transactions),
    [transactions],
  );
  const editableItemIds = useMemo(
    () => new Set(items.map(({ id }) => id)),
    [items],
  );
  const unknownTransactions = transactions.filter(
    (transaction) =>
      transaction.transactionType === "expense" &&
      !editableItemIds.has(transaction.itemId),
  );
  const hasAdjustments = transactions.some(
    ({ transactionType }) => transactionType !== "expense",
  );

  function refreshCatalog() {
    const editableItems = createEditableItems(transactions);
    const existingItems = createExistingItems(
      transactions,
      new Set(editableItems.map(({ id }) => id)),
    );

    setItems(editableItems);
    setValues((current) =>
      Object.fromEntries(
        editableItems.map((item) => [
          item.id,
          current[item.id] ?? existingItems.get(item.id)?.amount ?? 0,
        ]),
      ),
    );
  }

  function updateAmount(itemId: string, rawValue: string) {
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
      [itemId]: amount,
    }));
    setMessage(null);
    setError(null);
  }

  function saveTaxPayments() {
    if (!businessDate || isSaving) {
      return;
    }

    const managedItemIds = new Set(items.map(({ id }) => id));
    const existingItems = createExistingItems(
      transactions,
      managedItemIds,
    );
    const now = new Date().toISOString();
    const nextManagedTransactions: ExpenseTransaction[] = [];

    items.forEach((item) => {
      const amount = values[item.id] ?? 0;

      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }

      const existing = existingItems.get(item.id);

      if (existing && existing.amount === amount && existing.count === 1) {
        nextManagedTransactions.push({ ...existing.representative });
        return;
      }

      nextManagedTransactions.push({
        id: existing?.representative.id ?? createExpenseTransactionId(),
        businessDate,
        group: "tax-payment",
        itemId: item.id as ExpenseItemId,
        itemName: item.label,
        amount,
        transactionType: "expense",
        createdAt: existing?.representative.createdAt ?? now,
        updatedAt: now,
      });
    });

    const preservedTransactions = transactions
      .filter(
        (transaction) =>
          transaction.transactionType !== "expense" ||
          !managedItemIds.has(transaction.itemId),
      )
      .map((transaction) => ({ ...transaction }));
    const nextTransactions = [
      ...preservedTransactions,
      ...nextManagedTransactions,
    ];
    const currentSignature = getManagedSignature(
      transactions,
      managedItemIds,
    );
    const nextSignature = getManagedSignature(
      nextTransactions,
      managedItemIds,
    );

    if (currentSignature === nextSignature) {
      router.push("/closing/expenses");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setError(null);

    if (
      replaceExpenseTransactionsByGroup(
        businessDate,
        "tax-payment",
        nextTransactions,
      )
    ) {
      if (setExpenseUnconfirmed(businessDate)) {
        router.push("/closing/expenses");
      } else {
        setError("비용 확인 상태를 변경하지 못했습니다. 다시 시도해주세요.");
      }
    } else {
      setError(
        "세금 납부 내역을 저장하지 못했습니다. 다시 시도해주세요.",
      );
    }

    setIsSaving(false);
  }

  if (!businessDate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          세금 납부를 불러오고 있어요.
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
            세금 납부
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {formatBusinessDate(businessDate)} 영업일
          </p>
        </header>

        <section className="mt-5 rounded-xl bg-indigo-50 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-indigo-500">
                실제 세금 납부
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-700">
                {formatMoney(storedSummary.byGroup["tax-payment"])}
              </p>
            </div>
            <span className="text-sm font-bold text-indigo-600">
              {storedSummary.transactionCount}건
            </span>
          </div>
          {hasAdjustments && (
            <p className="mt-2 text-[11px] leading-4 text-indigo-400">
              환급·취소 조정 내역이 합계에 반영되어 있습니다.
            </p>
          )}
        </section>

        <section className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold leading-5 text-amber-800">
            실제로 납부한 세금만 입력해주세요.
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-amber-700">
            예상 부가가치세와 예상 종합소득세는 경영성과에서 별도로
            제공될 예정입니다.
          </p>
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 px-4">
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const amount = values[item.id] ?? 0;

              return (
                <label
                  key={item.id}
                  className="flex min-h-13 items-center gap-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-700">
                      {item.label}
                    </span>
                    {!item.enabled && (
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        비활성 과거 항목
                      </span>
                    )}
                  </span>
                  <div className="flex w-40 shrink-0 items-center rounded-lg bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-indigo-100">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        amount === 0
                          ? ""
                          : amount.toLocaleString("ko-KR")
                      }
                      onChange={(event) =>
                        updateAmount(item.id, event.target.value)
                      }
                      placeholder="0"
                      className="min-w-0 flex-1 bg-transparent py-3 text-right text-base font-bold text-slate-900 outline-none"
                    />
                    <span className="ml-1.5 text-xs text-slate-500">원</span>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {unknownTransactions.length > 0 && (
          <section className="mt-4 rounded-xl bg-slate-50 p-4">
            <h2 className="text-sm font-bold text-slate-800">
              기타 과거 항목
            </h2>
            <div className="mt-2 space-y-2">
              {unknownTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 break-words text-slate-500">
                    {transaction.itemName}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-700">
                    {formatMoney(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-400">
              현재 항목 목록에 없어 읽기 전용으로 표시합니다.
            </p>
          </section>
        )}

        <CustomExpenseItemManager
          group="tax-payment"
          groupLabel="세금 납부"
          onChanged={refreshCatalog}
        />

        <section className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-800">
              실제 세금 납부 합계
            </span>
            <span className="text-xl font-bold text-indigo-600">
              {formatMoney(inputTotal)}
            </span>
          </div>
        </section>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          0원으로 저장하면 해당 항목 기록이 삭제됩니다.
          환급·취소와 기타 과거 항목은 유지됩니다.
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
          onClick={saveTaxPayments}
          disabled={isSaving}
          className="mt-5 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-wait disabled:bg-indigo-400"
        >
          {isSaving ? "저장 중..." : "세금 납부 저장"}
        </button>
      </div>
    </main>
  );
}
