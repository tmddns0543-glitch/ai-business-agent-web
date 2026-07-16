import type {
  CustomizableExpenseGroup,
  ExpenseItemId,
} from "@/types/expense";

export function createExpenseCustomItemId(
  group: CustomizableExpenseGroup,
): ExpenseItemId {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `custom.${group}.${globalThis.crypto.randomUUID()}`;
  }

  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 12);

  return `custom.${group}.${timestamp}-${randomPart}`;
}
