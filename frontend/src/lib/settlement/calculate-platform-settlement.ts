import { sumSettlementResults } from "@/lib/settlement/calculate-total-settlement";
import type { SettlementResult } from "@/types/settlement";

export function calculatePlatformSettlement(
  results: readonly SettlementResult[],
): SettlementResult {
  return sumSettlementResults(results);
}
