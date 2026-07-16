import {
  isValidBusinessDate,
  type BusinessDate,
  type BusinessDayContext,
} from "@/types/business-day";

export const BUSINESS_DAY_CONTEXT_STORAGE_KEY = "business-day-context";

const BUSINESS_DAY_CONTEXT_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getTodayBusinessDate(): BusinessDate {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseBusinessDayContext(value: unknown): BusinessDayContext | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.version !== BUSINESS_DAY_CONTEXT_VERSION ||
    !isValidBusinessDate(value.selectedBusinessDate)
  ) {
    return null;
  }

  return {
    version: BUSINESS_DAY_CONTEXT_VERSION,
    selectedBusinessDate: value.selectedBusinessDate,
  };
}

export function getBusinessDayContext(): BusinessDayContext {
  const fallback: BusinessDayContext = {
    version: BUSINESS_DAY_CONTEXT_VERSION,
    selectedBusinessDate: getTodayBusinessDate(),
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const saved = window.localStorage.getItem(
      BUSINESS_DAY_CONTEXT_STORAGE_KEY,
    );

    if (saved === null) {
      return fallback;
    }

    return parseBusinessDayContext(JSON.parse(saved)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getSelectedBusinessDate(): BusinessDate {
  return getBusinessDayContext().selectedBusinessDate;
}

export function setSelectedBusinessDate(date: BusinessDate): boolean {
  if (!isValidBusinessDate(date) || typeof window === "undefined") {
    return false;
  }

  const context: BusinessDayContext = {
    version: BUSINESS_DAY_CONTEXT_VERSION,
    selectedBusinessDate: date,
  };

  try {
    window.localStorage.setItem(
      BUSINESS_DAY_CONTEXT_STORAGE_KEY,
      JSON.stringify(context),
    );

    return true;
  } catch {
    return false;
  }
}
