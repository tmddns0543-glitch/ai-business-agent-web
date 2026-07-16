import type { BusinessDate } from "@/types/business-day";
import type { SettlementPlatformId } from "@/types/settlement";

export type ExpenseGroup =
  | "material-purchase"
  | "platform-cost"
  | "fixed-cost"
  | "operating-cost"
  | "labor-cost"
  | "tax-payment";

export type CustomizableExpenseGroup = Exclude<
  ExpenseGroup,
  "material-purchase"
>;

export type ExpenseTransactionType =
  | "expense"
  | "refund"
  | "cancellation";

export type ExpensePlatformId = Exclude<SettlementPlatformId, "general">;

export type ExpenseEvidenceType =
  | "receipt"
  | "invoice"
  | "statement"
  | "other";

export type ExpenseOcrStatus =
  | "none"
  | "pending"
  | "completed"
  | "failed";

export type ExpenseTaxTreatment =
  | "taxable"
  | "tax-exempt"
  | "deemed-input-tax-credit";

export type DefaultExpenseItemId =
  | "material-purchase.purchase"
  | "platform-cost.advertising"
  | "platform-cost.coupon"
  | "fixed-cost.rent"
  | "fixed-cost.electricity"
  | "fixed-cost.gas"
  | "fixed-cost.water"
  | "fixed-cost.water-purifier"
  | "fixed-cost.cctv"
  | "fixed-cost.telecom"
  | "fixed-cost.card-terminal"
  | "fixed-cost.pos"
  | "fixed-cost.pest-control"
  | "fixed-cost.insurance"
  | "operating-cost.fixtures"
  | "operating-cost.employee-welfare"
  | "operating-cost.fuel"
  | "operating-cost.other-fees"
  | "operating-cost.consumables"
  | "operating-cost.kitchen-tools"
  | "operating-cost.repairs"
  | "labor-cost.payroll"
  | "labor-cost.employer-social-insurance"
  | "labor-cost.other-labor"
  | "tax-payment.vat"
  | "tax-payment.comprehensive-income-tax"
  | "tax-payment.withholding-tax"
  | "tax-payment.local-income-tax"
  | "tax-payment.other-tax";

export type ExpenseItemId =
  | DefaultExpenseItemId
  | `custom.${string}`;

export interface ExpenseTransaction {
  id: string;
  businessDate: BusinessDate;
  group: ExpenseGroup;
  itemId: ExpenseItemId;
  itemName: string;
  amount: number;
  transactionType: ExpenseTransactionType;
  vendorName?: string;
  platformId?: ExpensePlatformId;
  memo?: string;
  estimatedInputVat?: number;
  taxTreatment?: ExpenseTaxTreatment;
  evidenceId?: string;
  evidenceType?: ExpenseEvidenceType;
  ocrStatus?: ExpenseOcrStatus;
  inventoryApplied?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCustomItem {
  id: string;
  group: CustomizableExpenseGroup;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyExpenseMemo {
  businessDate: BusinessDate;
  memo: string;
  updatedAt: string;
}

export interface ExpenseGroupDefinition {
  readonly id: ExpenseGroup;
  readonly label: string;
  readonly description: string;
  readonly order: number;
}

export interface ExpenseItemDefinition {
  readonly id: ExpenseItemId;
  readonly group: ExpenseGroup;
  readonly label: string;
  readonly enabled: boolean;
  readonly system: boolean;
  readonly supportsPlatformBreakdown: boolean;
  readonly supportsVendor: boolean;
  readonly supportsMemo: boolean;
  readonly estimatesInputVat: boolean;
  readonly affectsCashFlow: boolean;
  readonly affectsOperatingProfit: boolean;
  readonly affectsTaxEstimate: boolean;
  readonly createsAsset: boolean;
  readonly affectsInventory: boolean;
}
