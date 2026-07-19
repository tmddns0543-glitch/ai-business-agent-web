import type { BusinessDate } from "@/types/business-day";

export type DeliveryAgencyTransactionType =
  | "cash-charge"
  | "charge-fee"
  | "delivery-fee"
  | "cash-credit"
  | "monthly-fee";

export type DeliveryAgencyPaymentSource =
  | "cash-balance"
  | "bank-account"
  | "card"
  | "other";

export type DeliveryAgencyChargeFeeMode =
  | "deduct-from-payment"
  | "additional-payment";

export interface DeliveryAgencyTransaction {
  id: string;
  businessDate: BusinessDate;
  agencyId: string;
  agencyName: string;
  type: DeliveryAgencyTransactionType;
  amount: number;
  paymentSource?: DeliveryAgencyPaymentSource;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAgency {
  id: string;
  name: string;
  enabled: boolean;
  initialCashBalance: number;
  chargeFeeMode: DeliveryAgencyChargeFeeMode;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAgencySummary {
  transactionCount: number;
  cashChargeTotal: number;
  chargeFeeTotal: number;
  deliveryFeeTotal: number;
  cashCreditTotal: number;
  monthlyFeeTotal: number;
  operatingExpenseTotal: number;
  externalCashOutflowTotal: number;
  estimatedInputVatTotal: number;
  openingCashBalance: number;
  cashBalanceChange: number;
  closingCashBalance: number;
}

export interface DeliveryAgencySummaryByAgency {
  agencyId: string;
  agencyName: string;
  summary: DeliveryAgencySummary;
}
