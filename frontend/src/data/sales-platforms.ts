import type { SalesPlatformConfig } from "@/types/sales-platform";

export const BAEMIN_CONFIG: SalesPlatformConfig = {
  platformKey: "baemin",
  title: "배달의민족",
  description: "배달의민족에서 확인한 매출을 입력해주세요.",
  storageKey: "sales-baemin",
  fields: [
    {
      key: "prepaid",
      label: "선결제 매출",
      description: "배달의민족 앱에서 결제된 주문 매출",
      type: "money",
    },
    {
      key: "card",
      label: "카드 매출",
      description: "매장에서 카드로 결제된 주문 매출",
      type: "money",
    },
    {
      key: "cash",
      label: "현금 매출",
      description: "현금으로 결제된 주문 매출",
      type: "money",
    },
    {
      key: "baeminOne",
      label: "배민원 매출",
      description: "배민원 주문의 총매출",
      type: "money",
    },
    {
      key: "baeminOneOrders",
      label: "배민원 주문 수",
      description: "주문당 평균매출과 수수료 계산에 사용됩니다.",
      type: "count",
    },
  ],
};


export const COUPANG_EATS_CONFIG: SalesPlatformConfig = {
  platformKey: "coupang-eats",
  title: "쿠팡이츠",
  description: "쿠팡이츠 매출과 주문 수를 입력해주세요.",
  storageKey: "sales-coupang-eats",
  fields: [
    {
      key: "sales",
      label: "쿠팡이츠 매출",
      description: "쿠팡이츠에서 확인한 총매출",
      type: "money",
    },
    {
      key: "orders",
      label: "쿠팡이츠 주문 수",
      description: "주문당 평균매출과 수수료 계산에 사용됩니다.",
      type: "count",
    },
  ],
};


export const YOGIYO_CONFIG: SalesPlatformConfig = {
  platformKey: "yogiyo",
  title: "요기요",
  description: "요기요에서 확인한 매출을 입력해주세요.",
  storageKey: "sales-yogiyo",
  fields: [
    {
      key: "prepaid",
      label: "요기요 선결제 매출",
      description: "요기요 앱에서 결제된 주문 매출",
      type: "money",
    },
    {
      key: "card",
      label: "요기요 카드 매출",
      description: "매장에서 카드로 결제된 요기요 주문 매출",
      type: "money",
    },
    {
      key: "cash",
      label: "요기요 현금 매출",
      description: "현금으로 결제된 요기요 주문 매출",
      type: "money",
    },
    {
      key: "yogiDelivery",
      label: "요기배달 매출",
      description: "요기배달 주문의 총매출",
      type: "money",
    },
    {
      key: "yogiDeliveryOrders",
      label: "요기배달 주문 수",
      description: "주문당 평균매출과 배달비 계산에 사용됩니다.",
      type: "count",
    },
  ],
};


export const DDANGYO_CONFIG: SalesPlatformConfig = {
  platformKey: "ddangyo",
  title: "땡겨요",
  description: "땡겨요에서 확인한 매출을 입력해주세요.",
  storageKey: "sales-ddangyo",

  fields: [
    {
      key: "prepaid",
      label: "땡겨요 선결제 매출",
      description: "땡겨요 앱에서 결제된 주문 매출",
      type: "money",
    },
  ],
};