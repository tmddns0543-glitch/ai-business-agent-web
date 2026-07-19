import type {
  MonthlyInventoryRecord,
  MonthlyMaterialCostResult,
} from "@/types/inventory";

function normalizeAmount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function calculateMonthlyMaterialCost(input: {
  materialPurchases: number;
  inventoryProfitEnabled: boolean;
  inventoryRecord?: MonthlyInventoryRecord;
  monthEnded: boolean;
}): MonthlyMaterialCostResult {
  const materialPurchases = normalizeAmount(input.materialPurchases);

  if (!input.inventoryProfitEnabled) {
    return {
      materialPurchases,
      materialCost: materialPurchases,
      inventoryApplied: false,
      status: "confirmed",
    };
  }

  const beginningInventory = input.inventoryRecord?.beginningInventory;
  const endingInventory = input.inventoryRecord?.endingInventory;
  const inventoryConfirmed =
    input.inventoryRecord?.endingInventoryStatus === "confirmed";

  if (
    beginningInventory !== null &&
    beginningInventory !== undefined &&
    endingInventory !== null &&
    endingInventory !== undefined &&
    inventoryConfirmed
  ) {
    return {
      materialPurchases,
      materialCost:
        normalizeAmount(beginningInventory) +
        materialPurchases -
        normalizeAmount(endingInventory),
      inventoryApplied: true,
      status: "confirmed",
    };
  }

  return {
    materialPurchases,
    materialCost: input.monthEnded ? null : materialPurchases,
    inventoryApplied: false,
    status: input.monthEnded ? "waiting" : "estimated",
  };
}
