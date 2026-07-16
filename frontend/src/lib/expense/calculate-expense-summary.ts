import { getExpenseGroupFinancialEffects } from "@/lib/expense/expense-financial-effects";
import type {
  ExpenseGroup,
  ExpenseTransaction,
} from "@/types/expense";
import type { ExpenseSummary } from "@/types/expense-storage";

const EXPENSE_GROUPS: readonly ExpenseGroup[] = [
  "material-purchase",
  "platform-cost",
  "fixed-cost",
  "operating-cost",
  "labor-cost",
  "tax-payment",
];

function createEmptyGroupTotals(): Record<ExpenseGroup, number> {
  return Object.fromEntries(
    EXPENSE_GROUPS.map((group) => [group, 0]),
  ) as Record<ExpenseGroup, number>;
}

export function getSignedExpenseAmount(
  transaction: ExpenseTransaction,
): number {
  if (
    !Number.isFinite(transaction.amount) ||
    transaction.amount < 0
  ) {
    return 0;
  }

  return transaction.transactionType === "expense"
    ? transaction.amount
    : -transaction.amount;
}

export function calculateExpenseSummary(
  transactions: readonly ExpenseTransaction[],
): ExpenseSummary {
  const byGroup = createEmptyGroupTotals();
  const transactionCountByGroup = createEmptyGroupTotals();
  let totalCashOutflow = 0;
  let operatingExpenseTotal = 0;
  let taxPaymentTotal = 0;
  let estimatedInputVatTotal = 0;

  transactions.forEach((transaction) => {
    const signedAmount = getSignedExpenseAmount(transaction);
    const direction = transaction.transactionType === "expense" ? 1 : -1;
    const estimatedInputVat =
      typeof transaction.estimatedInputVat === "number" &&
      Number.isFinite(transaction.estimatedInputVat) &&
      transaction.estimatedInputVat >= 0
        ? transaction.estimatedInputVat * direction
        : 0;
    const effects = getExpenseGroupFinancialEffects(transaction.group);

    byGroup[transaction.group] += signedAmount;
    transactionCountByGroup[transaction.group] += 1;

    if (effects.affectsCashFlow) {
      totalCashOutflow += signedAmount;
    }

    if (effects.affectsOperatingProfit) {
      operatingExpenseTotal += signedAmount;
    }

    if (transaction.group === "tax-payment") {
      taxPaymentTotal += signedAmount;
    }

    estimatedInputVatTotal += estimatedInputVat;
  });

  return {
    transactionCount: transactions.length,
    totalCashOutflow,
    operatingExpenseTotal,
    taxPaymentTotal,
    estimatedInputVatTotal,
    byGroup,
    transactionCountByGroup,
  };
}
