import { isValidBusinessDate, type BusinessDate } from "@/types/business-day";
import type {
  BusinessDayClosingStatus,
  BusinessDayClosingStatusStorageData,
  ClosingSection,
  ConfirmableSectionStatus,
  ExpenseClosingStatus,
  FinalClosingStatus,
} from "@/types/closing-status-by-business-day";

export const BUSINESS_DAY_CLOSING_STATUS_STORAGE_KEY =
  "business-day-closing-status";

const CLOSING_STATUS_STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isClosingSectionStatus(
  value: unknown,
): value is ConfirmableSectionStatus {
  return value === "unconfirmed" || value === "confirmed";
}

function readExpenseClosingStatus(value: unknown): ExpenseClosingStatus | null {
  if (
    value === "unconfirmed" ||
    value === "confirmed-with-data" ||
    value === "confirmed-none"
  ) {
    return value;
  }

  return value === "confirmed" ? "unconfirmed" : null;
}

function isFinalClosingStatus(value: unknown): value is FinalClosingStatus {
  return value === "open" || value === "completed";
}

function createEmptyStorage(): BusinessDayClosingStatusStorageData {
  return {
    version: CLOSING_STATUS_STORAGE_VERSION,
    days: {},
  };
}

function createDefaultStatus(): BusinessDayClosingStatus {
  return {
    salesStatus: "unconfirmed",
    expenseStatus: "unconfirmed",
    deliveryStatus: "unconfirmed",
    closingStatus: "open",
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function parseClosingStatus(value: unknown): BusinessDayClosingStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  const expenseStatus = readExpenseClosingStatus(value.expenseStatus);

  if (
    !isClosingSectionStatus(value.salesStatus) ||
    !expenseStatus ||
    !isClosingSectionStatus(value.deliveryStatus) ||
    !isFinalClosingStatus(value.closingStatus) ||
    (value.completedAt !== null && typeof value.completedAt !== "string") ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    salesStatus: value.salesStatus,
    expenseStatus,
    deliveryStatus: value.deliveryStatus,
    closingStatus: value.closingStatus,
    completedAt: value.completedAt,
    updatedAt: value.updatedAt,
  };
}

function parseStorage(
  value: unknown,
): BusinessDayClosingStatusStorageData {
  if (
    !isRecord(value) ||
    value.version !== CLOSING_STATUS_STORAGE_VERSION ||
    !isRecord(value.days)
  ) {
    return createEmptyStorage();
  }

  const days = Object.fromEntries(
    Object.entries(value.days).flatMap(([businessDate, status]) => {
      const parsedStatus = parseClosingStatus(status);

      return isValidBusinessDate(businessDate) && parsedStatus
        ? [[businessDate, parsedStatus]]
        : [];
    }),
  );

  return {
    version: CLOSING_STATUS_STORAGE_VERSION,
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

export function getClosingStatusStorage(): BusinessDayClosingStatusStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyStorage();
  }

  try {
    const saved = storage.getItem(BUSINESS_DAY_CLOSING_STATUS_STORAGE_KEY);

    return saved ? parseStorage(JSON.parse(saved) as unknown) : createEmptyStorage();
  } catch {
    return createEmptyStorage();
  }
}

export function getClosingStatusByBusinessDate(
  businessDate: BusinessDate,
): BusinessDayClosingStatus {
  if (!isValidBusinessDate(businessDate)) {
    return createDefaultStatus();
  }

  const saved = getClosingStatusStorage().days[businessDate];

  return saved ? { ...saved } : createDefaultStatus();
}

export function updateClosingStatusByBusinessDate(
  businessDate: BusinessDate,
  update: Partial<Omit<BusinessDayClosingStatus, "updatedAt">>,
): boolean {
  if (!isValidBusinessDate(businessDate)) {
    return false;
  }

  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  const currentStorage = getClosingStatusStorage();
  const currentStatus = getClosingStatusByBusinessDate(businessDate);
  const nextStatus: BusinessDayClosingStatus = {
    ...currentStatus,
    ...update,
    updatedAt: new Date().toISOString(),
  };
  const nextStorage: BusinessDayClosingStatusStorageData = {
    version: CLOSING_STATUS_STORAGE_VERSION,
    days: {
      ...currentStorage.days,
      [businessDate]: nextStatus,
    },
  };

  try {
    storage.setItem(
      BUSINESS_DAY_CLOSING_STATUS_STORAGE_KEY,
      JSON.stringify(nextStorage),
    );
    return true;
  } catch {
    return false;
  }
}

export function setSectionConfirmed(
  businessDate: BusinessDate,
  section: ClosingSection,
): boolean {
  return updateClosingStatusByBusinessDate(businessDate, {
    [`${section}Status`]: "confirmed",
  });
}

export function setSectionUnconfirmed(
  businessDate: BusinessDate,
  section: ClosingSection,
): boolean {
  return updateClosingStatusByBusinessDate(businessDate, {
    [`${section}Status`]: "unconfirmed",
    closingStatus: "open",
    completedAt: null,
  });
}

export function setExpenseConfirmedWithData(
  businessDate: BusinessDate,
): boolean {
  return updateClosingStatusByBusinessDate(businessDate, {
    expenseStatus: "confirmed-with-data",
  });
}

export function setExpenseConfirmedNone(
  businessDate: BusinessDate,
): boolean {
  return updateClosingStatusByBusinessDate(businessDate, {
    expenseStatus: "confirmed-none",
  });
}

export function setExpenseUnconfirmed(
  businessDate: BusinessDate,
): boolean {
  return updateClosingStatusByBusinessDate(businessDate, {
    expenseStatus: "unconfirmed",
    closingStatus: "open",
    completedAt: null,
  });
}

export function completeBusinessDayClosing(
  businessDate: BusinessDate,
): boolean {
  const completedAt = new Date().toISOString();

  return updateClosingStatusByBusinessDate(businessDate, {
    closingStatus: "completed",
    completedAt,
  });
}

export function reopenBusinessDayClosing(
  businessDate: BusinessDate,
): boolean {
  return updateClosingStatusByBusinessDate(businessDate, {
    closingStatus: "open",
    completedAt: null,
  });
}
