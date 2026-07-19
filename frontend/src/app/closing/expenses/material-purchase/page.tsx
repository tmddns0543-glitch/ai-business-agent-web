"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  EXPENSE_ITEM_IDS,
  getDefaultExpenseItem,
} from "@/data/expense-default-items";
import { calculateEstimatedInputVat } from "@/lib/expense/calculate-estimated-input-vat";
import { calculateExpenseSummary } from "@/lib/expense/calculate-expense-summary";
import { createExpenseTransactionId } from "@/lib/expense/create-expense-transaction-id";
import {
  filterMaterialVendorSuggestions,
  getMaterialVendorSuggestions,
} from "@/lib/material-vendor/get-material-vendor-suggestions";
import {
  cleanMaterialVendorName,
  normalizeMaterialVendorName,
} from "@/lib/material-vendor/normalize-material-vendor-name";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { setExpenseUnconfirmed } from "@/lib/storage/closing-status-by-business-day-storage";
import {
  addExpenseTransaction,
  getExpensesByBusinessDateAndGroup,
  removeExpenseTransaction,
  updateExpenseTransaction,
} from "@/lib/storage/expense-by-business-day-storage";
import {
  addMaterialVendor,
  findMaterialVendorByName,
  setMaterialVendorFavorite,
  upsertMaterialVendorFromExpense,
} from "@/lib/storage/material-vendor-storage";
import {
  formatBusinessDate,
  type BusinessDate,
} from "@/types/business-day";
import type { ExpenseTransaction } from "@/types/expense";
import type { MaterialVendorSuggestion } from "@/types/material-vendor";

const MATERIAL_PURCHASE_ITEM = getDefaultExpenseItem(
  EXPENSE_ITEM_IDS.MATERIAL_PURCHASE,
);

const MAX_VENDOR_NAME_LENGTH = 80;
const MAX_MEMO_LENGTH = 300;

function formatMoney(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return `${safeValue.toLocaleString("ko-KR")}원`;
}

function getTransactionTypeLabel(
  transactionType: ExpenseTransaction["transactionType"],
) {
  if (transactionType === "refund") {
    return "환급";
  }

  if (transactionType === "cancellation") {
    return "취소";
  }

  return "매입";
}

export default function MaterialPurchasePage() {
  const router = useRouter();
  const vendorAutocompleteRef = useRef<HTMLDivElement>(null);
  const [businessDate, setBusinessDate] = useState<BusinessDate | null>(null);
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [vendorSuggestions, setVendorSuggestions] = useState<
    MaterialVendorSuggestion[]
  >([]);
  const [isVendorSuggestionsOpen, setIsVendorSuggestionsOpen] =
    useState(false);
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- LocalStorage hydration runs only after the client mounts. */
  useEffect(() => {
    const selectedBusinessDate = getSelectedBusinessDate();

    setBusinessDate(selectedBusinessDate);
    setTransactions(
      getExpensesByBusinessDateAndGroup(
        selectedBusinessDate,
        "material-purchase",
      ),
    );
    setVendorSuggestions(getMaterialVendorSuggestions());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function closeVendorSuggestions(event: MouseEvent) {
      if (
        vendorAutocompleteRef.current &&
        !vendorAutocompleteRef.current.contains(event.target as Node)
      ) {
        setIsVendorSuggestionsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeVendorSuggestions);

    return () => {
      document.removeEventListener("mousedown", closeVendorSuggestions);
    };
  }, []);

  const summary = useMemo(
    () => calculateExpenseSummary(transactions),
    [transactions],
  );
  const estimatedInputVat = calculateEstimatedInputVat(amount);
  const isFormValid =
    vendorName.trim().length > 0 &&
    Number.isFinite(amount) &&
    amount > 0;
  const displayedTransactions = [...transactions].reverse();
  const filteredVendorSuggestions = useMemo(
    () =>
      filterMaterialVendorSuggestions(
        vendorSuggestions,
        vendorName,
        6,
      ),
    [vendorName, vendorSuggestions],
  );

  function refreshVendorSuggestions() {
    setVendorSuggestions(getMaterialVendorSuggestions());
  }

  function selectVendor(suggestion: MaterialVendorSuggestion) {
    setVendorName(suggestion.name);
    setIsVendorSuggestionsOpen(false);
    setError(null);
  }

  function toggleVendorFavorite(
    suggestion: MaterialVendorSuggestion,
  ) {
    let vendorId = suggestion.id;

    if (!vendorId) {
      vendorId = addMaterialVendor(suggestion.name)?.id ?? null;
    }

    if (
      vendorId &&
      setMaterialVendorFavorite(vendorId, !suggestion.favorite)
    ) {
      refreshVendorSuggestions();
    }
  }

  function refreshTransactions(date: BusinessDate) {
    setTransactions(
      getExpensesByBusinessDateAndGroup(date, "material-purchase"),
    );
  }

  function resetForm() {
    setVendorName("");
    setAmount(0);
    setMemo("");
    setEditingId(null);
    setError(null);
  }

  function markExpenseChanged(date: BusinessDate): boolean {
    return setExpenseUnconfirmed(date);
  }

  function hasUnsavedInput(): boolean {
    const cleanedVendorName = cleanMaterialVendorName(vendorName);
    const trimmedMemo = memo.trim();

    if (!editingId) {
      return cleanedVendorName !== "" || amount !== 0 || trimmedMemo !== "";
    }

    const existingTransaction = transactions.find(
      ({ id }) => id === editingId,
    );

    if (!existingTransaction) {
      return true;
    }

    return (
      normalizeMaterialVendorName(existingTransaction.vendorName ?? "") !==
        normalizeMaterialVendorName(cleanedVendorName) ||
      existingTransaction.amount !== amount ||
      (existingTransaction.memo ?? "").trim() !== trimmedMemo
    );
  }

  function finishMaterialPurchaseInput() {
    if (isSaving) {
      return;
    }

    if (hasUnsavedInput()) {
      setIsExitDialogOpen(true);
      return;
    }

    router.push("/closing/expenses");
  }

  function saveTransaction() {
    if (!businessDate || isSaving) {
      return;
    }

    const cleanedVendorName = cleanMaterialVendorName(vendorName);
    const savedVendorName =
      findMaterialVendorByName(cleanedVendorName)?.name ??
      cleanedVendorName;
    const trimmedMemo = memo.trim();

    if (!savedVendorName) {
      setError("거래처명을 입력해주세요.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("매입금액은 0원보다 커야 합니다.");
      return;
    }

    if (!MATERIAL_PURCHASE_ITEM) {
      setError("원재료 매입 항목을 불러오지 못했습니다.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (editingId) {
      const existingTransaction = transactions.find(
        ({ id }) => id === editingId,
      );
      const nextMemo = trimmedMemo || undefined;

      if (
        existingTransaction &&
        existingTransaction.vendorName === savedVendorName &&
        existingTransaction.amount === amount &&
        existingTransaction.memo === nextMemo &&
        existingTransaction.estimatedInputVat === estimatedInputVat &&
        existingTransaction.taxTreatment === "taxable" &&
        existingTransaction.inventoryApplied === false
      ) {
        setMessage("변경된 내용이 없습니다. 계속 입력할 수 있습니다.");
        setIsSaving(false);
        return;
      }

      const saved = updateExpenseTransaction(businessDate, editingId, {
        vendorName: savedVendorName,
        amount,
        memo: nextMemo,
        estimatedInputVat,
        taxTreatment: "taxable",
        inventoryApplied: false,
      });

      if (saved) {
        if (!markExpenseChanged(businessDate)) {
          setError("비용 확인 상태를 변경하지 못했습니다. 다시 시도해주세요.");
          setIsSaving(false);
          return;
        }
        if (
          existingTransaction &&
          normalizeMaterialVendorName(
            existingTransaction.vendorName ?? "",
          ) !== normalizeMaterialVendorName(savedVendorName)
        ) {
          upsertMaterialVendorFromExpense(savedVendorName);
          refreshVendorSuggestions();
        }
        refreshTransactions(businessDate);
        resetForm();
        setMessage("원재료 매입을 저장했습니다. 계속 입력할 수 있습니다.");
      } else {
        setError("원재료 매입을 저장하지 못했습니다. 다시 시도해주세요.");
      }

      setIsSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const transaction: ExpenseTransaction = {
      id: createExpenseTransactionId(),
      businessDate,
      group: "material-purchase",
      itemId: MATERIAL_PURCHASE_ITEM.id,
      itemName: MATERIAL_PURCHASE_ITEM.label,
      amount,
      transactionType: "expense",
      vendorName: savedVendorName,
      ...(trimmedMemo && { memo: trimmedMemo }),
      estimatedInputVat,
      taxTreatment: "taxable",
      inventoryApplied: false,
      createdAt: now,
      updatedAt: now,
    };

    if (addExpenseTransaction(transaction)) {
      if (!markExpenseChanged(businessDate)) {
        setError("비용 확인 상태를 변경하지 못했습니다. 다시 시도해주세요.");
        setIsSaving(false);
        return;
      }
      upsertMaterialVendorFromExpense(savedVendorName);
      refreshVendorSuggestions();
      refreshTransactions(businessDate);
      resetForm();
      setMessage("원재료 매입을 저장했습니다. 계속 입력할 수 있습니다.");
    } else {
      setError("원재료 매입을 저장하지 못했습니다. 다시 시도해주세요.");
    }

    setIsSaving(false);
  }

  function startEditing(transaction: ExpenseTransaction) {
    if (transaction.transactionType !== "expense") {
      window.alert("환급·취소 거래 수정은 아직 지원하지 않습니다.");
      return;
    }

    setEditingId(transaction.id);
    setVendorName(transaction.vendorName ?? "");
    setAmount(transaction.amount);
    setMemo(transaction.memo ?? "");
    setMessage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteTransaction(transaction: ExpenseTransaction) {
    if (!businessDate || isSaving) {
      return;
    }

    if (transaction.transactionType !== "expense") {
      window.alert("환급·취소 거래 삭제는 아직 지원하지 않습니다.");
      return;
    }

    if (!window.confirm("이 원재료 매입 기록을 삭제할까요?")) {
      return;
    }

    if (removeExpenseTransaction(businessDate, transaction.id)) {
      refreshTransactions(businessDate);

      if (!markExpenseChanged(businessDate)) {
        setError("비용 확인 상태를 변경하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      if (editingId === transaction.id) {
        resetForm();
      }

      setMessage("원재료 매입 기록을 삭제했습니다.");
      setError(null);
    } else {
      setError("원재료 매입 기록을 삭제하지 못했습니다.");
    }
  }

  if (!businessDate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-500">
          원재료 매입 내용을 불러오고 있어요.
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
            원재료 매입
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {formatBusinessDate(businessDate)} 영업일
          </p>
        </header>

        <section className="mt-5 rounded-xl bg-indigo-50 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-indigo-500">
                총 매입금액
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-700">
                {formatMoney(summary.byGroup["material-purchase"])}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold text-indigo-600">
              {summary.transactionCount}건
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-indigo-100 pt-3 text-sm">
            <span className="text-slate-600">예상 매입세액 합계</span>
            <span className="font-bold text-slate-800">
              {formatMoney(summary.estimatedInputVatTotal)}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-400">
            현재 입력 기준 단순 예상치입니다.
          </p>
        </section>

        <section className="mt-5">
          <h2 className="text-lg font-bold text-slate-900">
            {editingId ? "원재료 매입 수정" : "원재료 매입 추가"}
          </h2>

          <div className="mt-3 space-y-3">
            <div ref={vendorAutocompleteRef} className="relative">
              <label htmlFor="material-vendor-name" className="block">
              <span className="text-sm font-bold text-slate-700">
                거래처명
              </span>
              <input
                id="material-vendor-name"
                type="text"
                value={vendorName}
                maxLength={MAX_VENDOR_NAME_LENGTH}
                onChange={(event) => {
                  setVendorName(event.target.value);
                  setIsVendorSuggestionsOpen(true);
                  setError(null);
                }}
                onFocus={() => setIsVendorSuggestionsOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsVendorSuggestionsOpen(false);
                  }

                  if (
                    event.key === "Enter" &&
                    isVendorSuggestionsOpen
                  ) {
                    event.preventDefault();

                    if (filteredVendorSuggestions[0]) {
                      selectVendor(filteredVendorSuggestions[0]);
                    }
                  }
                }}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="material-vendor-suggestions"
                aria-expanded={isVendorSuggestionsOpen}
                placeholder="예: 짜르푸드"
                className="mt-1.5 min-h-13 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              </label>

              {isVendorSuggestionsOpen && (
                <div
                  id="material-vendor-suggestions"
                  role="listbox"
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  {filteredVendorSuggestions.length > 0 ? (
                    filteredVendorSuggestions.map((suggestion) => (
                      <div
                        key={
                          suggestion.id ??
                          `history-${suggestion.normalizedName}`
                        }
                        role="option"
                        aria-selected={false}
                        className="flex min-h-11 items-center gap-1 rounded-lg hover:bg-slate-50"
                      >
                        <button
                          type="button"
                          onClick={() => selectVendor(suggestion)}
                          className="min-w-0 flex-1 px-3 py-2.5 text-left"
                        >
                          <span className="block truncate text-sm font-semibold text-slate-700">
                            {suggestion.name}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {suggestion.favorite
                              ? "즐겨찾기"
                              : suggestion.usageCount > 0
                                ? `${suggestion.usageCount}회 사용`
                                : "과거 거래처"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleVendorFavorite(suggestion);
                          }}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg text-amber-500 hover:bg-amber-50"
                          aria-label={`${suggestion.name} ${
                            suggestion.favorite
                              ? "즐겨찾기 해제"
                              : "즐겨찾기 추가"
                          }`}
                        >
                          {suggestion.favorite ? "★" : "☆"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="px-3 py-3 text-xs leading-5 text-slate-500">
                      직접 입력한 이름으로 저장할 수 있습니다.
                    </p>
                  )}
                </div>
              )}
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                매입금액
              </span>
              <div className="mt-1.5 flex min-h-13 items-center rounded-xl border border-slate-200 px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount === 0 ? "" : amount.toLocaleString("ko-KR")}
                  onChange={(event) => {
                    const rawValue = event.target.value;

                    if (rawValue.includes("-")) {
                      setAmount(0);
                      setError("매입금액은 0원보다 커야 합니다.");
                      return;
                    }

                    const digits = rawValue.replace(/\D/g, "");
                    const nextAmount = digits ? Number(digits) : 0;

                    if (!Number.isFinite(nextAmount)) {
                      setAmount(0);
                      setError("올바른 매입금액을 입력해주세요.");
                      return;
                    }

                    setAmount(nextAmount);
                    setError(null);
                  }}
                  placeholder="0"
                  className="min-w-0 flex-1 bg-transparent py-3 text-right text-xl font-bold text-slate-950 outline-none"
                />
                <span className="ml-2 text-sm font-medium text-slate-500">
                  원
                </span>
              </div>
              <span className="mt-1.5 block text-right text-xs text-slate-500">
                예상 매입세액 {formatMoney(estimatedInputVat)}
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">메모</span>
              <textarea
                value={memo}
                maxLength={MAX_MEMO_LENGTH}
                onChange={(event) => setMemo(event.target.value)}
                rows={3}
                placeholder="선택 입력"
                className="mt-1.5 block w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

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
            onClick={saveTransaction}
            disabled={!isFormValid || isSaving}
            className="mt-4 min-h-14 w-full rounded-2xl bg-indigo-600 px-4 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isSaving
              ? "저장 중..."
              : editingId
                ? "변경사항 저장"
                : "저장"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              수정 취소
            </button>
          )}
        </section>

        <section className="mt-7 border-t border-slate-200 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">매입 내역</h2>
            <span className="text-xs text-slate-500">
              최근 입력 순
            </span>
          </div>

          {displayedTransactions.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              입력된 원재료 매입이 없습니다.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {displayedTransactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="rounded-xl border border-slate-200 px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-bold text-slate-900">
                          {transaction.vendorName || "거래처 미입력"}
                        </h3>
                        {transaction.transactionType !== "expense" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            {getTransactionTypeLabel(
                              transaction.transactionType,
                            )}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xl font-bold text-slate-950">
                        {formatMoney(transaction.amount)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-slate-400">
                        예상 매입세액
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-600">
                        {formatMoney(transaction.estimatedInputVat ?? 0)}
                      </p>
                    </div>
                  </div>

                  {transaction.memo && (
                    <p className="mt-2 break-words border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500">
                      {transaction.memo}
                    </p>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(transaction)}
                      disabled={transaction.transactionType !== "expense"}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(transaction)}
                      disabled={transaction.transactionType !== "expense"}
                      className="rounded-lg px-3 py-2 text-xs font-bold text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={finishMaterialPurchaseInput}
          disabled={isSaving}
          className="mt-6 min-h-14 w-full rounded-2xl bg-slate-900 px-4 text-base font-bold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-wait disabled:bg-slate-500"
        >
          원재료 매입 입력 완료
        </button>

      </div>

      {isExitDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-6 sm:items-center"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="material-purchase-exit-dialog-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2
              id="material-purchase-exit-dialog-title"
              className="text-lg font-bold text-slate-950"
            >
              저장하지 않은 입력값이 있습니다.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              현재 작성 중인 원재료매입은 저장되지 않았습니다.
              <br />
              입력을 종료하고 비용 화면으로 이동하시겠습니까?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsExitDialogOpen(false)}
                className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                계속 입력
              </button>
              <button
                type="button"
                onClick={() => router.push("/closing/expenses")}
                className="min-h-12 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                저장하지 않고 이동
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
