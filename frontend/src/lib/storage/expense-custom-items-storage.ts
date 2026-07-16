import type {
  CustomizableExpenseGroup,
  ExpenseCustomItem,
} from "@/types/expense";
import type {
  ExpenseCatalogOptions,
  ExpenseCustomItemsStorageData,
} from "@/types/expense-storage";

export const EXPENSE_CUSTOM_ITEMS_STORAGE_KEY = "expense-custom-items";

const CUSTOM_ITEMS_STORAGE_VERSION = 1;

const CUSTOMIZABLE_GROUPS: readonly CustomizableExpenseGroup[] = [
  "platform-cost",
  "fixed-cost",
  "operating-cost",
  "labor-cost",
  "tax-payment",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function isCustomizableGroup(
  value: unknown,
): value is CustomizableExpenseGroup {
  return CUSTOMIZABLE_GROUPS.some((group) => group === value);
}

function parseCustomItem(value: unknown): ExpenseCustomItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.trim().length === 0 ||
    !isCustomizableGroup(value.group) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    typeof value.enabled !== "boolean" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    group: value.group,
    name: cleanName(value.name),
    enabled: value.enabled,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function cloneCustomItem(item: ExpenseCustomItem): ExpenseCustomItem {
  return { ...item };
}

function createEmptyStorage(): ExpenseCustomItemsStorageData {
  return {
    version: CUSTOM_ITEMS_STORAGE_VERSION,
    items: [],
  };
}

function parseStorage(value: unknown): ExpenseCustomItemsStorageData {
  if (
    !isRecord(value) ||
    value.version !== CUSTOM_ITEMS_STORAGE_VERSION ||
    !Array.isArray(value.items)
  ) {
    return createEmptyStorage();
  }

  const items: ExpenseCustomItem[] = [];
  const ids = new Set<string>();
  const namesByGroup = new Set<string>();

  value.items.forEach((valueItem) => {
    const item = parseCustomItem(valueItem);

    if (!item) {
      return;
    }

    const nameKey = `${item.group}:${normalizeName(item.name)}`;

    if (ids.has(item.id) || namesByGroup.has(nameKey)) {
      return;
    }

    ids.add(item.id);
    namesByGroup.add(nameKey);
    items.push(item);
  });

  return {
    version: CUSTOM_ITEMS_STORAGE_VERSION,
    items,
  };
}

function getLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function saveStorage(data: ExpenseCustomItemsStorageData): boolean {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(EXPENSE_CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function getExpenseCustomItemsStorage(): ExpenseCustomItemsStorageData {
  const storage = getLocalStorage();

  if (!storage) {
    return createEmptyStorage();
  }

  try {
    const saved = storage.getItem(EXPENSE_CUSTOM_ITEMS_STORAGE_KEY);

    return saved ? parseStorage(JSON.parse(saved) as unknown) : createEmptyStorage();
  } catch {
    return createEmptyStorage();
  }
}

export function getExpenseCustomItems(): ExpenseCustomItem[] {
  return getExpenseCustomItemsStorage().items.map(cloneCustomItem);
}

export function getExpenseCustomItemsByGroup(
  group: CustomizableExpenseGroup,
  options: ExpenseCatalogOptions = {},
): ExpenseCustomItem[] {
  return getExpenseCustomItems().filter(
    (item) =>
      item.group === group && (options.includeDisabled || item.enabled),
  );
}

export function getExpenseCustomItem(
  itemId: string,
): ExpenseCustomItem | undefined {
  const item = getExpenseCustomItems().find(({ id }) => id === itemId);

  return item ? cloneCustomItem(item) : undefined;
}

function hasDuplicateName(
  items: readonly ExpenseCustomItem[],
  group: CustomizableExpenseGroup,
  name: string,
  exceptId?: string,
) {
  const normalizedName = normalizeName(name);

  return items.some(
    (item) =>
      item.id !== exceptId &&
      item.group === group &&
      normalizeName(item.name) === normalizedName,
  );
}

export function addExpenseCustomItem(item: ExpenseCustomItem): boolean {
  const parsedItem = parseCustomItem(item);

  if (!parsedItem) {
    return false;
  }

  const current = getExpenseCustomItemsStorage();

  if (
    current.items.some(({ id }) => id === parsedItem.id) ||
    hasDuplicateName(current.items, parsedItem.group, parsedItem.name)
  ) {
    return false;
  }

  return saveStorage({
    version: CUSTOM_ITEMS_STORAGE_VERSION,
    items: [...current.items.map(cloneCustomItem), parsedItem],
  });
}

type ExpenseCustomItemUpdate = Partial<
  Pick<ExpenseCustomItem, "name" | "enabled">
>;

export function updateExpenseCustomItem(
  itemId: string,
  update: ExpenseCustomItemUpdate,
): boolean {
  const current = getExpenseCustomItemsStorage();
  const index = current.items.findIndex(({ id }) => id === itemId);

  if (index < 0) {
    return false;
  }

  const currentItem = current.items[index];
  const nextItem = parseCustomItem({
    ...currentItem,
    ...update,
    id: currentItem.id,
    group: currentItem.group,
    createdAt: currentItem.createdAt,
    updatedAt: new Date().toISOString(),
  });

  if (
    !nextItem ||
    hasDuplicateName(
      current.items,
      currentItem.group,
      nextItem.name,
      currentItem.id,
    )
  ) {
    return false;
  }

  return saveStorage({
    version: CUSTOM_ITEMS_STORAGE_VERSION,
    items: current.items.map((item, position) =>
      position === index ? nextItem : cloneCustomItem(item),
    ),
  });
}

export function setExpenseCustomItemEnabled(
  itemId: string,
  enabled: boolean,
): boolean {
  return updateExpenseCustomItem(itemId, { enabled });
}
