import type { BusinessDate } from "@/types/business-day";
import type { InventoryMonth } from "@/types/inventory";

const INVENTORY_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function isValidInventoryMonth(
  value: unknown,
): value is InventoryMonth {
  if (typeof value !== "string") {
    return false;
  }

  const match = INVENTORY_MONTH_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  return year >= 1 && month >= 1 && month <= 12;
}

export function getInventoryMonthFromBusinessDate(
  businessDate: BusinessDate,
): InventoryMonth {
  return businessDate.slice(0, 7);
}

export function getCurrentInventoryMonth(): InventoryMonth {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function getPreviousInventoryMonth(
  month: InventoryMonth,
): InventoryMonth | null {
  if (!isValidInventoryMonth(month)) {
    return null;
  }

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  if (monthNumber === 1) {
    return year === 1
      ? null
      : `${String(year - 1).padStart(4, "0")}-12`;
  }

  return `${yearText}-${String(monthNumber - 1).padStart(2, "0")}`;
}

export function isCalendarMonthEnd(businessDate: BusinessDate): boolean {
  const [year, month, day] = businessDate.split("-").map(Number);

  if (![year, month, day].every(Number.isInteger)) {
    return false;
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return day === lastDay;
}

export function formatInventoryMonth(month: InventoryMonth): string {
  const [year, monthNumber] = month.split("-").map(Number);

  return `${year}년 ${monthNumber}월`;
}
