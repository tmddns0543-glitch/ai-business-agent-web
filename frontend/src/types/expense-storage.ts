import type { BusinessDate } from "@/types/business-day";
import type {
  DailyExpenseMemo,
  ExpenseCustomItem,
  ExpenseGroup,
  ExpenseItemId,
  ExpenseTransaction,
} from "@/types/expense";

export interface BusinessDayExpenseStorageData {
  version: 1;
  days: Partial<Record<BusinessDate, ExpenseTransaction[]>>;
}

export interface ExpenseCustomItemsStorageData {
  version: 1;
  items: ExpenseCustomItem[];
}

export interface DailyExpenseMemoStorageData {
  version: 1;
  days: Partial<Record<BusinessDate, DailyExpenseMemo>>;
}

export interface ExpenseSummary {
  transactionCount: number;
  totalCashOutflow: number;
  operatingExpenseTotal: number;
  taxPaymentTotal: number;
  estimatedInputVatTotal: number;
  byGroup: Record<ExpenseGroup, number>;
  transactionCountByGroup: Record<ExpenseGroup, number>;
}

export interface ExpenseCatalogItem {
  readonly id: ExpenseItemId | string;
  readonly group: ExpenseGroup;
  readonly label: string;
  readonly system: boolean;
  readonly enabled: boolean;
}

export interface ExpenseCatalogOptions {
  includeDisabled?: boolean;
}

export interface ExpenseGroupFinancialEffects {
  readonly affectsCashFlow: boolean;
  readonly affectsOperatingProfit: boolean;
  readonly affectsTaxEstimate: boolean;
}
