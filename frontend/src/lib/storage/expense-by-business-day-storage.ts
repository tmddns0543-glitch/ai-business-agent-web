import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type {
  ExpenseEvidenceType,
  ExpenseGroup,
  ExpenseItemId,
  ExpenseOcrStatus,
  ExpensePlatformId,
  ExpenseTaxTreatment,
  ExpenseTransaction,
  ExpenseTransactionType,
} from "@/types/expense";
import type { BusinessDayExpenseStorageData } from "@/types/expense-storage";

export const BUSINESS_DAY_EXPENSES_STORAGE_KEY = "business-day-expenses";

const EXPENSE_STORAGE_VERSION = 1;

const EXPENSE_GROUPS: readonly ExpenseGroup[] = [
  "material-purchase",
  "platform-cost",
  "fixed-cost",
  "operating-cost",
  "labor-cost",
  "tax-payment",
];

const TRANSACTION_TYPES: readonly ExpenseTransactionType[] = [
  "expense",
  "refund",
  "cancellation",
];

const PLATFORM_IDS: readonly ExpensePlatformId[] = [
  "baemin",
  "coupang-eats",
  "yogiyo",
  "ddangyo",
];

const EVIDENCE_TYPES: readonly ExpenseEvidenceType[] = [
  "receipt",
  "invoice",
  "statement",
  "other",
];

const OCR_STATUSES: readonly ExpenseOcrStatus[] = [
  "none",
  "pending",
  "completed",
  "failed",
];

const TAX_TREATMENTS: readonly ExpenseTaxTreatment[] = [
  "taxable",
  "tax-exempt",
  "deemed-input-tax-credit",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function includesValue<T>(values: readonly T[], value: unknown): value is T {
  return values.some((candidate) => candidate === value);
}

function readOptionalString(
  value: unknown,
): { valid: true; value?: string } | { valid: false } {
  return value === undefined || typeof value === "string"
    ? { valid: true, value }
    : { valid: false };
}

function parseExpenseTransaction(value: unknown): ExpenseTransaction | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isNonEmptyString(value.id) ||
    !isValidBusinessDate(value.businessDate) ||
    !includesValue(EXPENSE_GROUPS, value.group) ||
    !isNonEmptyString(value.itemId) ||
    !isNonEmptyString(value.itemName) ||
    !isNonNegativeFiniteNumber(value.amount) ||
    !includesValue(TRANSACTION_TYPES, value.transactionType) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const vendorName = readOptionalString(value.vendorName);
  const memo = readOptionalString(value.memo);
  const evidenceId = readOptionalString(value.evidenceId);

  if (
    !vendorName.valid ||
    !memo.valid ||
    !evidenceId.valid ||
    (value.platformId !== undefined &&
      !includesValue(PLATFORM_IDS, value.platformId)) ||
    (value.estimatedInputVat !== undefined &&
      !isNonNegativeFiniteNumber(value.estimatedInputVat)) ||
    (value.evidenceType !== undefined &&
      !includesValue(EVIDENCE_TYPES, value.evidenceType)) ||
    (value.ocrStatus !== undefined &&
      !includesValue(OCR_STATUSES, value.ocrStatus)) ||
    (value.inventoryApplied !== undefined &&
      typeof value.inventoryApplied !== "boolean") ||
    (value.taxTreatment !== undefined &&
      !includesValue(TAX_TREATMENTS, value.taxTreatment))
  ) {
    return null;
  }

  return {
    id: value.id,
    businessDate: value.businessDate,
    group: value.group,
    itemId: value.itemId as ExpenseItemId,
    itemName: value.itemName,
    amount: value.amount,
    transactionType: value.transactionType,
    ...(vendorName.value !== undefined && { vendorName: vendorName.value }),
    ...(value.platformId !== undefined && { platformId: value.platformId }),
    ...(memo.value !== undefined && { memo: memo.value }),
    ...(value.estimatedInputVat !== undefined && {
      estimatedInputVat: value.estimatedInputVat,
    }),
    ...(evidenceId.value !== undefined && { evidenceId: evidenceId.value }),
    ...(value.evidenceType !== undefined && {
      evidenceType: value.evidenceType,
    }),
    ...(value.ocrStatus !== undefined && { ocrStatus: value.ocrStatus }),
    ...(value.inventoryApplied !== undefined && {
      inventoryApplied: value.inventoryApplied,
    }),
    ...(value.taxTreatment !== undefined && {
      taxTreatment: value.taxTreatment,
    }),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function cloneTransaction(transaction: ExpenseTransaction): ExpenseTransaction {
  return { ...transaction };
}

function createEmptyStorage(): BusinessDayExpenseStorageData {
  return {
    version: EXPENSE_STORAGE_VERSION,
    days: {},
  };
}

function parseStorage(value: unknown): BusinessDayExpenseStorageData {
  if (
    !isRecord(value) ||
    value.version !== EXPENSE_STORAGE_VERSION ||
    !isRecord(value.days)
  ) {
    return createEmptyStorage();
  }

  const days = Object.fromEntries(
    Object.entries(value.days).flatMap(([businessDate, transactions]) => {
      if (!isValidBusinessDate(businessDate) || !Array.isArray(transactions)) {
        return [];
      }

      const validTransactions = transactions
        .map(parseExpenseTransaction)
        .filter(
          (transaction): transaction is ExpenseTransaction =>
            transaction !== null &&
            transaction.businessDate === businessDate,
        );

      return [[businessDate, validTransactions]];
    }),
  );

  return {
    version: EXPENSE_STORAGE_VERSION,
    days,
  };
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function saveStorage(data: BusinessDayExpenseStorageData): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(BUSINESS_DAY_EXPENSES_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function getBusinessDayExpenseStorage(): BusinessDayExpenseStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyStorage();
  }

  try {
    const saved = storage.getItem(BUSINESS_DAY_EXPENSES_STORAGE_KEY);

    return saved ? parseStorage(JSON.parse(saved) as unknown) : createEmptyStorage();
  } catch {
    return createEmptyStorage();
  }
}

export function getExpensesByBusinessDate(
  businessDate: BusinessDate,
): ExpenseTransaction[] {
  if (!isValidBusinessDate(businessDate)) {
    return [];
  }

  return (getBusinessDayExpenseStorage().days[businessDate] ?? []).map(
    cloneTransaction,
  );
}

export function getAllExpenseTransactions(): ExpenseTransaction[] {
  return Object.values(getBusinessDayExpenseStorage().days)
    .flatMap((transactions) => transactions ?? [])
    .map(cloneTransaction);
}

export function getExpensesByBusinessDateAndGroup(
  businessDate: BusinessDate,
  group: ExpenseGroup,
): ExpenseTransaction[] {
  return getExpensesByBusinessDate(businessDate).filter(
    (transaction) => transaction.group === group,
  );
}

export function getExpenseById(
  businessDate: BusinessDate,
  expenseId: string,
): ExpenseTransaction | undefined {
  const transaction = getExpensesByBusinessDate(businessDate).find(
    ({ id }) => id === expenseId,
  );

  return transaction ? cloneTransaction(transaction) : undefined;
}

export function addExpenseTransaction(
  transaction: ExpenseTransaction,
): boolean {
  const parsedTransaction = parseExpenseTransaction(transaction);

  if (!parsedTransaction) {
    return false;
  }

  const current = getBusinessDayExpenseStorage();
  const currentTransactions =
    current.days[parsedTransaction.businessDate] ?? [];

  if (currentTransactions.some(({ id }) => id === parsedTransaction.id)) {
    return false;
  }

  return saveStorage({
    version: EXPENSE_STORAGE_VERSION,
    days: {
      ...current.days,
      [parsedTransaction.businessDate]: [
        ...currentTransactions.map(cloneTransaction),
        cloneTransaction(parsedTransaction),
      ],
    },
  });
}

type ExpenseTransactionUpdate = Partial<
  Omit<
    ExpenseTransaction,
    "id" | "businessDate" | "createdAt" | "updatedAt"
  >
>;

export function updateExpenseTransaction(
  businessDate: BusinessDate,
  expenseId: string,
  update: ExpenseTransactionUpdate,
): boolean {
  const current = getBusinessDayExpenseStorage();
  const currentTransactions = current.days[businessDate];

  if (!currentTransactions) {
    return false;
  }

  const index = currentTransactions.findIndex(({ id }) => id === expenseId);

  if (index < 0) {
    return false;
  }

  const currentTransaction = currentTransactions[index];
  const nextTransaction = parseExpenseTransaction({
    ...currentTransaction,
    ...update,
    id: currentTransaction.id,
    businessDate: currentTransaction.businessDate,
    createdAt: currentTransaction.createdAt,
    updatedAt: new Date().toISOString(),
  });

  if (!nextTransaction) {
    return false;
  }

  const nextTransactions = currentTransactions.map((transaction, position) =>
    position === index
      ? cloneTransaction(nextTransaction)
      : cloneTransaction(transaction),
  );

  return saveStorage({
    version: EXPENSE_STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: nextTransactions,
    },
  });
}

export function removeExpenseTransaction(
  businessDate: BusinessDate,
  expenseId: string,
): boolean {
  const current = getBusinessDayExpenseStorage();
  const currentTransactions = current.days[businessDate];

  if (!currentTransactions?.some(({ id }) => id === expenseId)) {
    return false;
  }

  return saveStorage({
    version: EXPENSE_STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: currentTransactions
        .filter(({ id }) => id !== expenseId)
        .map(cloneTransaction),
    },
  });
}

export function removeExpensesByBusinessDate(
  businessDate: BusinessDate,
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const current = getBusinessDayExpenseStorage();
  const nextDays = { ...current.days };

  delete nextDays[businessDate];

  return saveStorage({
    version: EXPENSE_STORAGE_VERSION,
    days: nextDays,
  });
}

export function replaceExpensesByBusinessDate(
  businessDate: BusinessDate,
  transactions: readonly ExpenseTransaction[],
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const replacements = transactions.map(parseExpenseTransaction);

  if (
    replacements.some(
      (transaction) =>
        transaction === null || transaction.businessDate !== businessDate,
    )
  ) {
    return false;
  }

  const current = getBusinessDayExpenseStorage();

  return saveStorage({
    version: EXPENSE_STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: replacements.map(
        (transaction) => cloneTransaction(transaction as ExpenseTransaction),
      ),
    },
  });
}

export function replaceExpenseTransactionsByGroup(
  businessDate: BusinessDate,
  group: ExpenseGroup,
  transactions: readonly ExpenseTransaction[],
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const parsedTransactions = transactions.map(parseExpenseTransaction);

  if (
    parsedTransactions.some(
      (transaction) =>
        transaction === null ||
        transaction.businessDate !== businessDate ||
        transaction.group !== group,
    )
  ) {
    return false;
  }

  const replacements = parsedTransactions
    .filter(
      (transaction): transaction is ExpenseTransaction =>
        transaction !== null && transaction.amount > 0,
    )
    .map(cloneTransaction);
  const replacementIds = replacements.map(({ id }) => id);

  if (new Set(replacementIds).size !== replacementIds.length) {
    return false;
  }

  const current = getBusinessDayExpenseStorage();
  const otherGroups = (current.days[businessDate] ?? [])
    .filter((transaction) => transaction.group !== group)
    .map(cloneTransaction);

  if (
    otherGroups.some((transaction) => replacementIds.includes(transaction.id))
  ) {
    return false;
  }

  return saveStorage({
    version: EXPENSE_STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: [...otherGroups, ...replacements],
    },
  });
}
