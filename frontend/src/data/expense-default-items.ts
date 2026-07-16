import type {
  CustomizableExpenseGroup,
  DefaultExpenseItemId,
  ExpenseGroup,
  ExpenseGroupDefinition,
  ExpenseItemDefinition,
  ExpenseItemId,
} from "@/types/expense";

export const EXPENSE_GROUPS = [
  {
    id: "material-purchase",
    label: "원재료 매입",
    description: "식재료와 원재료의 거래처별 매입을 기록합니다.",
    order: 1,
  },
  {
    id: "platform-cost",
    label: "플랫폼 비용",
    description: "배달 플랫폼별 광고비와 쿠폰비를 기록합니다.",
    order: 2,
  },
  {
    id: "fixed-cost",
    label: "공과금·고정비",
    description: "월세와 공과금 등 반복적인 운영비를 기록합니다.",
    order: 3,
  },
  {
    id: "operating-cost",
    label: "일반 운영비",
    description: "매장 운영 중 발생한 일반 지출을 기록합니다.",
    order: 4,
  },
  {
    id: "labor-cost",
    label: "인건비",
    description: "급여와 사업주 부담 인건비를 기록합니다.",
    order: 5,
  },
  {
    id: "tax-payment",
    label: "세금 납부",
    description: "실제로 납부한 세금의 현금 유출을 기록합니다.",
    order: 6,
  },
] as const satisfies readonly ExpenseGroupDefinition[];

export const EXPENSE_ITEM_IDS = {
  MATERIAL_PURCHASE: "material-purchase.purchase",
  PLATFORM_ADVERTISING: "platform-cost.advertising",
  PLATFORM_COUPON: "platform-cost.coupon",
  FIXED_RENT: "fixed-cost.rent",
  FIXED_ELECTRICITY: "fixed-cost.electricity",
  FIXED_GAS: "fixed-cost.gas",
  FIXED_WATER: "fixed-cost.water",
  FIXED_WATER_PURIFIER: "fixed-cost.water-purifier",
  FIXED_CCTV: "fixed-cost.cctv",
  FIXED_TELECOM: "fixed-cost.telecom",
  FIXED_CARD_TERMINAL: "fixed-cost.card-terminal",
  FIXED_POS: "fixed-cost.pos",
  FIXED_PEST_CONTROL: "fixed-cost.pest-control",
  FIXED_INSURANCE: "fixed-cost.insurance",
  OPERATING_FIXTURES: "operating-cost.fixtures",
  OPERATING_EMPLOYEE_WELFARE: "operating-cost.employee-welfare",
  OPERATING_FUEL: "operating-cost.fuel",
  OPERATING_OTHER_FEES: "operating-cost.other-fees",
  OPERATING_CONSUMABLES: "operating-cost.consumables",
  OPERATING_KITCHEN_TOOLS: "operating-cost.kitchen-tools",
  OPERATING_REPAIRS: "operating-cost.repairs",
  LABOR_PAYROLL: "labor-cost.payroll",
  LABOR_EMPLOYER_SOCIAL_INSURANCE:
    "labor-cost.employer-social-insurance",
  LABOR_OTHER: "labor-cost.other-labor",
  TAX_VAT: "tax-payment.vat",
  TAX_COMPREHENSIVE_INCOME: "tax-payment.comprehensive-income-tax",
  TAX_WITHHOLDING: "tax-payment.withholding-tax",
  TAX_LOCAL_INCOME: "tax-payment.local-income-tax",
  TAX_OTHER: "tax-payment.other-tax",
} as const satisfies Readonly<Record<string, DefaultExpenseItemId>>;

const OPERATING_EXPENSE_EFFECTS = {
  enabled: true,
  system: true,
  supportsPlatformBreakdown: false,
  supportsVendor: false,
  supportsMemo: false,
  estimatesInputVat: false,
  affectsCashFlow: true,
  affectsOperatingProfit: true,
  affectsTaxEstimate: true,
  createsAsset: false,
  affectsInventory: false,
} as const;

const TAX_PAYMENT_EFFECTS = {
  ...OPERATING_EXPENSE_EFFECTS,
  affectsOperatingProfit: false,
  affectsTaxEstimate: false,
} as const;

export const DEFAULT_EXPENSE_ITEMS = [
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.MATERIAL_PURCHASE,
    group: "material-purchase",
    label: "원재료 매입",
    supportsVendor: true,
    supportsMemo: true,
    estimatesInputVat: true,
    affectsInventory: true,
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.PLATFORM_ADVERTISING,
    group: "platform-cost",
    label: "광고비",
    supportsPlatformBreakdown: true,
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.PLATFORM_COUPON,
    group: "platform-cost",
    label: "쿠폰비",
    supportsPlatformBreakdown: true,
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_RENT,
    group: "fixed-cost",
    label: "월세",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_ELECTRICITY,
    group: "fixed-cost",
    label: "전기세",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_GAS,
    group: "fixed-cost",
    label: "가스비",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_WATER,
    group: "fixed-cost",
    label: "수도세",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_WATER_PURIFIER,
    group: "fixed-cost",
    label: "정수기",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_CCTV,
    group: "fixed-cost",
    label: "CCTV",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_TELECOM,
    group: "fixed-cost",
    label: "통신비",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_CARD_TERMINAL,
    group: "fixed-cost",
    label: "카드단말기",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_POS,
    group: "fixed-cost",
    label: "포스기",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_PEST_CONTROL,
    group: "fixed-cost",
    label: "방역",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.FIXED_INSURANCE,
    group: "fixed-cost",
    label: "보험",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.OPERATING_FIXTURES,
    group: "operating-cost",
    label: "비품",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.OPERATING_EMPLOYEE_WELFARE,
    group: "operating-cost",
    label: "복리후생비",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.OPERATING_FUEL,
    group: "operating-cost",
    label: "주유비",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.OPERATING_OTHER_FEES,
    group: "operating-cost",
    label: "기타수수료",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.OPERATING_CONSUMABLES,
    group: "operating-cost",
    label: "소모품비",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.OPERATING_KITCHEN_TOOLS,
    group: "operating-cost",
    label: "주방용품",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.OPERATING_REPAIRS,
    group: "operating-cost",
    label: "수리비",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.LABOR_PAYROLL,
    group: "labor-cost",
    label: "급여",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.LABOR_EMPLOYER_SOCIAL_INSURANCE,
    group: "labor-cost",
    label: "4대보험 사업주 부담액",
  },
  {
    ...OPERATING_EXPENSE_EFFECTS,
    id: EXPENSE_ITEM_IDS.LABOR_OTHER,
    group: "labor-cost",
    label: "기타 인건비",
  },
  {
    ...TAX_PAYMENT_EFFECTS,
    id: EXPENSE_ITEM_IDS.TAX_VAT,
    group: "tax-payment",
    label: "부가가치세",
  },
  {
    ...TAX_PAYMENT_EFFECTS,
    id: EXPENSE_ITEM_IDS.TAX_COMPREHENSIVE_INCOME,
    group: "tax-payment",
    label: "종합소득세",
  },
  {
    ...TAX_PAYMENT_EFFECTS,
    id: EXPENSE_ITEM_IDS.TAX_WITHHOLDING,
    group: "tax-payment",
    label: "원천세",
  },
  {
    ...TAX_PAYMENT_EFFECTS,
    id: EXPENSE_ITEM_IDS.TAX_LOCAL_INCOME,
    group: "tax-payment",
    label: "지방소득세",
  },
  {
    ...TAX_PAYMENT_EFFECTS,
    id: EXPENSE_ITEM_IDS.TAX_OTHER,
    group: "tax-payment",
    label: "기타세금",
  },
] as const satisfies readonly ExpenseItemDefinition[];

export function getDefaultExpenseItemsByGroup(
  group: ExpenseGroup,
): ExpenseItemDefinition[] {
  return DEFAULT_EXPENSE_ITEMS.filter((item) => item.group === group).map(
    (item) => ({ ...item }),
  );
}

export function getDefaultExpenseItem(
  itemId: ExpenseItemId,
): ExpenseItemDefinition | undefined {
  const item = DEFAULT_EXPENSE_ITEMS.find(({ id }) => id === itemId);

  return item ? { ...item } : undefined;
}

export function isCustomizableExpenseGroup(
  group: ExpenseGroup,
): group is CustomizableExpenseGroup {
  return group !== "material-purchase";
}

export function getExpenseGroupDefinition(
  group: ExpenseGroup,
): ExpenseGroupDefinition | undefined {
  const definition = EXPENSE_GROUPS.find(({ id }) => id === group);

  return definition ? { ...definition } : undefined;
}
