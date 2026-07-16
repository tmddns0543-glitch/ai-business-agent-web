import type { DeliveryAgencyTransactionType } from "@/types/delivery-agency";

export interface DeliveryAgencyTransactionTypeDefinition {
  readonly type: DeliveryAgencyTransactionType;
  readonly label: string;
  readonly description: string;
  readonly cashBalanceEffect: "increase" | "decrease" | "none";
  readonly cashFlowEffect: "outflow" | "inflow" | "none";
  readonly affectsOperatingExpense: boolean;
  readonly estimatesInputVat: boolean;
}

export const DELIVERY_AGENCY_TRANSACTION_TYPES = [
  {
    type: "cash-charge",
    label: "캐시충전",
    description: "외부 자금을 배달대행사 캐시로 충전합니다.",
    cashBalanceEffect: "increase",
    cashFlowEffect: "outflow",
    affectsOperatingExpense: false,
    estimatesInputVat: false,
  },
  {
    type: "charge-fee",
    label: "충전수수료",
    description: "캐시 충전 과정에서 별도로 발생한 수수료입니다.",
    cashBalanceEffect: "none",
    cashFlowEffect: "outflow",
    affectsOperatingExpense: true,
    estimatesInputVat: false,
  },
  {
    type: "delivery-fee",
    label: "배달대행비",
    description: "배달 수행에 사용되어 캐시에서 차감된 실제 비용입니다.",
    cashBalanceEffect: "decrease",
    cashFlowEffect: "none",
    affectsOperatingExpense: true,
    estimatesInputVat: true,
  },
  {
    type: "cash-credit",
    label: "캐시입금",
    description: "보상이나 환급 등으로 캐시 잔액이 증가한 내역입니다.",
    cashBalanceEffect: "increase",
    cashFlowEffect: "none",
    affectsOperatingExpense: false,
    estimatesInputVat: false,
  },
  {
    type: "monthly-fee",
    label: "월정액수수료",
    description: "배달대행사 캐시에서 차감되는 월정액 비용입니다.",
    cashBalanceEffect: "decrease",
    cashFlowEffect: "none",
    affectsOperatingExpense: true,
    estimatesInputVat: true,
  },
] as const satisfies readonly DeliveryAgencyTransactionTypeDefinition[];

export function getDeliveryAgencyTransactionTypeDefinition(
  type: DeliveryAgencyTransactionType,
): DeliveryAgencyTransactionTypeDefinition {
  return DELIVERY_AGENCY_TRANSACTION_TYPES.find(
    (definition) => definition.type === type,
  )!;
}
