import {
  getDefaultExpenseItemsByGroup,
  isCustomizableExpenseGroup,
} from "@/data/expense-default-items";
import { getExpenseCustomItemsByGroup } from "@/lib/storage/expense-custom-items-storage";
import type { ExpenseGroup } from "@/types/expense";
import type {
  ExpenseCatalogItem,
  ExpenseCatalogOptions,
} from "@/types/expense-storage";

export function getExpenseItemsForGroup(
  group: ExpenseGroup,
  options: ExpenseCatalogOptions = {},
): ExpenseCatalogItem[] {
  const defaultItems = getDefaultExpenseItemsByGroup(group)
    .filter((item) => options.includeDisabled || item.enabled)
    .map<ExpenseCatalogItem>((item) => ({
      id: item.id,
      group: item.group,
      label: item.label,
      system: true,
      enabled: item.enabled,
    }));

  if (!isCustomizableExpenseGroup(group)) {
    return defaultItems.map((item) => ({ ...item }));
  }

  const customItems = getExpenseCustomItemsByGroup(group, options).map<
    ExpenseCatalogItem
  >((item) => ({
    id: item.id,
    group: item.group,
    label: item.name,
    system: false,
    enabled: item.enabled,
  }));

  return [...defaultItems, ...customItems].map((item) => ({ ...item }));
}
