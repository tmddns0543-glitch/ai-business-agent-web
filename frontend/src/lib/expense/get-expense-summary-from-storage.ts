import { calculateExpenseSummary } from "@/lib/expense/calculate-expense-summary";
import { getSelectedBusinessDate } from "@/lib/storage/business-day-storage";
import { getExpensesByBusinessDate } from "@/lib/storage/expense-by-business-day-storage";
import type { BusinessDate } from "@/types/business-day";
import type { ExpenseSummary } from "@/types/expense-storage";

export function getExpenseSummaryByBusinessDate(
  businessDate: BusinessDate,
): ExpenseSummary {
  return calculateExpenseSummary(getExpensesByBusinessDate(businessDate));
}

export function getExpenseSummaryFromStorage(): ExpenseSummary {
  return getExpenseSummaryByBusinessDate(getSelectedBusinessDate());
}
