import type { ExpenseGroup } from "@/types/expense";
import type { ExpenseGroupFinancialEffects } from "@/types/expense-storage";

export function getExpenseGroupFinancialEffects(
  group: ExpenseGroup,
): ExpenseGroupFinancialEffects {
  const isTaxPayment = group === "tax-payment";

  return {
    affectsCashFlow: true,
    affectsOperatingProfit: !isTaxPayment,
    affectsTaxEstimate: !isTaxPayment,
  };
}
