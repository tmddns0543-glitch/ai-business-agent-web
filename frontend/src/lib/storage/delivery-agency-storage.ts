import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type {
  DeliveryAgency,
  DeliveryAgencyChargeFeeMode,
  DeliveryAgencyPaymentSource,
  DeliveryAgencyTransaction,
  DeliveryAgencyTransactionType,
} from "@/types/delivery-agency";
import type {
  BusinessDayDeliveryTransactionStorageData,
  DeliveryAgencyStorageData,
} from "@/types/delivery-agency-storage";

export const DELIVERY_AGENCIES_STORAGE_KEY = "delivery-agencies";
export const BUSINESS_DAY_DELIVERY_TRANSACTIONS_STORAGE_KEY =
  "business-day-delivery-transactions";

const STORAGE_VERSION = 1;
const MAX_AGENCY_NAME_LENGTH = 40;

const TRANSACTION_TYPES: readonly DeliveryAgencyTransactionType[] = [
  "cash-charge",
  "charge-fee",
  "delivery-fee",
  "cash-credit",
  "monthly-fee",
];

const PAYMENT_SOURCES: readonly DeliveryAgencyPaymentSource[] = [
  "cash-balance",
  "bank-account",
  "card",
  "other",
];

const CHARGE_FEE_MODES: readonly DeliveryAgencyChargeFeeMode[] = [
  "deduct-from-payment",
  "additional-payment",
];

type DeliveryAgencyUpdate = Partial<
  Pick<
    DeliveryAgency,
    "name" | "enabled" | "initialCashBalance" | "chargeFeeMode"
  >
>;

type DeliveryTransactionUpdate = Partial<
  Omit<
    DeliveryAgencyTransaction,
    "id" | "businessDate" | "createdAt" | "updatedAt"
  >
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function includesValue<T>(values: readonly T[], value: unknown): value is T {
  return values.some((candidate) => candidate === value);
}

function cleanAgencyName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeAgencyName(name: string): string {
  return cleanAgencyName(name).toLocaleLowerCase("ko-KR");
}

function normalizeInitialCashBalance(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function createEmptyAgencyStorage(): DeliveryAgencyStorageData {
  return { version: STORAGE_VERSION, agencies: [] };
}

function createEmptyTransactionStorage(): BusinessDayDeliveryTransactionStorageData {
  return { version: STORAGE_VERSION, days: {} };
}

function cloneAgency(agency: DeliveryAgency): DeliveryAgency {
  return { ...agency };
}

function cloneTransaction(
  transaction: DeliveryAgencyTransaction,
): DeliveryAgencyTransaction {
  return { ...transaction };
}

function parseAgency(value: unknown): DeliveryAgency | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    typeof value.enabled !== "boolean" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const name = cleanAgencyName(value.name);

  if (name.length > MAX_AGENCY_NAME_LENGTH) {
    return null;
  }

  return {
    id: value.id,
    name,
    enabled: value.enabled,
    initialCashBalance: normalizeInitialCashBalance(value.initialCashBalance),
    chargeFeeMode: includesValue(CHARGE_FEE_MODES, value.chargeFeeMode)
      ? value.chargeFeeMode
      : "deduct-from-payment",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseAgencyStorage(value: unknown): DeliveryAgencyStorageData {
  if (
    !isRecord(value) ||
    value.version !== STORAGE_VERSION ||
    !Array.isArray(value.agencies)
  ) {
    return createEmptyAgencyStorage();
  }

  const agencies: DeliveryAgency[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  value.agencies.forEach((candidate) => {
    const agency = parseAgency(candidate);

    if (!agency) {
      return;
    }

    const normalizedName = normalizeAgencyName(agency.name);

    if (ids.has(agency.id) || names.has(normalizedName)) {
      return;
    }

    ids.add(agency.id);
    names.add(normalizedName);
    agencies.push(agency);
  });

  return { version: STORAGE_VERSION, agencies };
}

function parseTransaction(value: unknown): DeliveryAgencyTransaction | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isValidBusinessDate(value.businessDate) ||
    !isNonEmptyString(value.agencyId) ||
    !isNonEmptyString(value.agencyName) ||
    !includesValue(TRANSACTION_TYPES, value.type) ||
    typeof value.amount !== "number" ||
    !Number.isFinite(value.amount) ||
    value.amount < 0 ||
    (value.memo !== undefined && typeof value.memo !== "string") ||
    (value.paymentSource !== undefined &&
      !includesValue(PAYMENT_SOURCES, value.paymentSource)) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    businessDate: value.businessDate,
    agencyId: value.agencyId,
    agencyName: cleanAgencyName(value.agencyName),
    type: value.type,
    amount: value.amount,
    ...(value.paymentSource !== undefined && {
      paymentSource: value.paymentSource,
    }),
    ...(value.memo !== undefined && { memo: value.memo }),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parseTransactionStorage(
  value: unknown,
): BusinessDayDeliveryTransactionStorageData {
  if (
    !isRecord(value) ||
    value.version !== STORAGE_VERSION ||
    !isRecord(value.days)
  ) {
    return createEmptyTransactionStorage();
  }

  const transactionIds = new Set<string>();
  const days = Object.fromEntries(
    Object.entries(value.days).flatMap(([businessDate, candidates]) => {
      if (!isValidBusinessDate(businessDate) || !Array.isArray(candidates)) {
        return [];
      }

      const transactions = candidates.flatMap((candidate) => {
        const transaction = parseTransaction(candidate);

        if (
          !transaction ||
          transaction.businessDate !== businessDate ||
          transactionIds.has(transaction.id)
        ) {
          return [];
        }

        transactionIds.add(transaction.id);
        return [transaction];
      });

      return [[businessDate, transactions]];
    }),
  );

  return { version: STORAGE_VERSION, days };
}

function saveAgencyStorage(data: DeliveryAgencyStorageData): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(DELIVERY_AGENCIES_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function saveTransactionStorage(
  data: BusinessDayDeliveryTransactionStorageData,
): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      BUSINESS_DAY_DELIVERY_TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(data),
    );
    return true;
  } catch {
    return false;
  }
}

export function getDeliveryAgencyStorage(): DeliveryAgencyStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyAgencyStorage();
  }

  try {
    const saved = storage.getItem(DELIVERY_AGENCIES_STORAGE_KEY);
    return saved
      ? parseAgencyStorage(JSON.parse(saved) as unknown)
      : createEmptyAgencyStorage();
  } catch {
    return createEmptyAgencyStorage();
  }
}

export function getDeliveryAgencies(): DeliveryAgency[] {
  return getDeliveryAgencyStorage().agencies.map(cloneAgency);
}

export function getDeliveryAgencyById(
  agencyId: string,
): DeliveryAgency | undefined {
  const agency = getDeliveryAgencies().find(({ id }) => id === agencyId);
  return agency ? cloneAgency(agency) : undefined;
}

export function addDeliveryAgency(agency: DeliveryAgency): boolean {
  const parsedAgency = parseAgency(agency);

  if (!parsedAgency) {
    return false;
  }

  const current = getDeliveryAgencyStorage();
  const normalizedName = normalizeAgencyName(parsedAgency.name);

  if (
    current.agencies.some(
      (candidate) =>
        candidate.id === parsedAgency.id ||
        normalizeAgencyName(candidate.name) === normalizedName,
    )
  ) {
    return false;
  }

  return saveAgencyStorage({
    version: STORAGE_VERSION,
    agencies: [...current.agencies.map(cloneAgency), parsedAgency],
  });
}

export function updateDeliveryAgency(
  agencyId: string,
  update: DeliveryAgencyUpdate,
): boolean {
  const current = getDeliveryAgencyStorage();
  const index = current.agencies.findIndex(({ id }) => id === agencyId);

  if (index < 0) {
    return false;
  }

  const currentAgency = current.agencies[index];
  const nextAgency = parseAgency({
    ...currentAgency,
    ...update,
    id: currentAgency.id,
    createdAt: currentAgency.createdAt,
    updatedAt: new Date().toISOString(),
  });

  if (!nextAgency) {
    return false;
  }

  const normalizedName = normalizeAgencyName(nextAgency.name);

  if (
    current.agencies.some(
      (candidate, position) =>
        position !== index &&
        normalizeAgencyName(candidate.name) === normalizedName,
    )
  ) {
    return false;
  }

  return saveAgencyStorage({
    version: STORAGE_VERSION,
    agencies: current.agencies.map((agency, position) =>
      position === index ? nextAgency : cloneAgency(agency),
    ),
  });
}

export function setDeliveryAgencyEnabled(
  agencyId: string,
  enabled: boolean,
): boolean {
  return updateDeliveryAgency(agencyId, { enabled });
}

export function getDeliveryTransactionStorage(): BusinessDayDeliveryTransactionStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyTransactionStorage();
  }

  try {
    const saved = storage.getItem(
      BUSINESS_DAY_DELIVERY_TRANSACTIONS_STORAGE_KEY,
    );
    return saved
      ? parseTransactionStorage(JSON.parse(saved) as unknown)
      : createEmptyTransactionStorage();
  } catch {
    return createEmptyTransactionStorage();
  }
}

export function getDeliveryTransactionsByBusinessDate(
  businessDate: BusinessDate,
): DeliveryAgencyTransaction[] {
  if (!isValidBusinessDate(businessDate)) {
    return [];
  }

  return (
    getDeliveryTransactionStorage().days[businessDate] ?? []
  ).map(cloneTransaction);
}

export function getAllDeliveryTransactions(): DeliveryAgencyTransaction[] {
  return Object.values(getDeliveryTransactionStorage().days)
    .flatMap((transactions) => transactions ?? [])
    .map(cloneTransaction);
}

export function getDeliveryTransactionsByBusinessDateAndAgency(
  businessDate: BusinessDate,
  agencyId: string,
): DeliveryAgencyTransaction[] {
  return getDeliveryTransactionsByBusinessDate(businessDate).filter(
    (transaction) => transaction.agencyId === agencyId,
  );
}

export function addDeliveryTransaction(
  transaction: DeliveryAgencyTransaction,
): boolean {
  const parsedTransaction = parseTransaction(transaction);

  if (!parsedTransaction) {
    return false;
  }

  const current = getDeliveryTransactionStorage();
  const currentTransactions =
    current.days[parsedTransaction.businessDate] ?? [];

  const hasDuplicateId = Object.values(current.days).some((transactions) =>
    (transactions ?? []).some(({ id }) => id === parsedTransaction.id),
  );

  if (hasDuplicateId) {
    return false;
  }

  return saveTransactionStorage({
    version: STORAGE_VERSION,
    days: {
      ...current.days,
      [parsedTransaction.businessDate]: [
        ...currentTransactions.map(cloneTransaction),
        parsedTransaction,
      ],
    },
  });
}

export function updateDeliveryTransaction(
  businessDate: BusinessDate,
  transactionId: string,
  update: DeliveryTransactionUpdate,
): boolean {
  const current = getDeliveryTransactionStorage();
  const currentTransactions = current.days[businessDate];

  if (!currentTransactions) {
    return false;
  }

  const index = currentTransactions.findIndex(
    ({ id }) => id === transactionId,
  );

  if (index < 0) {
    return false;
  }

  const currentTransaction = currentTransactions[index];
  const nextTransaction = parseTransaction({
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

  return saveTransactionStorage({
    version: STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: currentTransactions.map((transaction, position) =>
        position === index
          ? nextTransaction
          : cloneTransaction(transaction),
      ),
    },
  });
}

export function removeDeliveryTransaction(
  businessDate: BusinessDate,
  transactionId: string,
): boolean {
  const current = getDeliveryTransactionStorage();
  const currentTransactions = current.days[businessDate];

  if (!currentTransactions?.some(({ id }) => id === transactionId)) {
    return false;
  }

  return saveTransactionStorage({
    version: STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: currentTransactions
        .filter(({ id }) => id !== transactionId)
        .map(cloneTransaction),
    },
  });
}

export function replaceDeliveryTransactionsByBusinessDate(
  businessDate: BusinessDate,
  transactions: readonly DeliveryAgencyTransaction[],
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const parsedTransactions = transactions.map(parseTransaction);

  if (
    parsedTransactions.some(
      (transaction) =>
        transaction === null || transaction.businessDate !== businessDate,
    )
  ) {
    return false;
  }

  const replacements = parsedTransactions.filter(
    (transaction): transaction is DeliveryAgencyTransaction =>
      transaction !== null && transaction.amount > 0,
  );
  const replacementIds = replacements.map(({ id }) => id);

  if (new Set(replacementIds).size !== replacementIds.length) {
    return false;
  }

  const current = getDeliveryTransactionStorage();
  const otherDays = Object.entries(current.days).flatMap(
    ([date, savedTransactions]) =>
      date === businessDate ? [] : savedTransactions ?? [],
  );

  if (
    otherDays.some((transaction) => replacementIds.includes(transaction.id))
  ) {
    return false;
  }

  return saveTransactionStorage({
    version: STORAGE_VERSION,
    days: {
      ...current.days,
      [businessDate]: replacements.map(cloneTransaction),
    },
  });
}
