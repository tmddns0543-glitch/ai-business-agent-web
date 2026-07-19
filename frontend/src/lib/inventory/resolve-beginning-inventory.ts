import { getPreviousInventoryMonth } from "@/lib/inventory/inventory-month";
import { getMonthlyInventoryRecord } from "@/lib/storage/monthly-inventory-storage";
import type {
  BeginningInventoryResolution,
  InventoryMonth,
} from "@/types/inventory";

export function resolveBeginningInventory(
  month: InventoryMonth,
): BeginningInventoryResolution {
  const currentRecord = getMonthlyInventoryRecord(month);

  if (currentRecord?.beginningInventory !== null &&
      currentRecord?.beginningInventory !== undefined) {
    return {
      amount: currentRecord.beginningInventory,
      source: "explicit",
      sourceMonth: month,
    };
  }

  const previousMonth = getPreviousInventoryMonth(month);
  const previousRecord = previousMonth
    ? getMonthlyInventoryRecord(previousMonth)
    : undefined;

  if (
    previousMonth &&
    previousRecord?.endingInventoryStatus === "confirmed" &&
    previousRecord.endingInventory !== null
  ) {
    return {
      amount: previousRecord.endingInventory,
      source: "previous-ending",
      sourceMonth: previousMonth,
    };
  }

  return {
    amount: null,
    source: "missing",
    sourceMonth: null,
  };
}
