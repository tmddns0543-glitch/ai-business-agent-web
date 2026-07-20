import { LocalStorageSalesRepository } from "@/repositories/sales/local-storage-sales-repository";
import type { SalesRepository } from "@/repositories/sales/sales-repository";
import { SalesRepositoryError } from "@/repositories/sales/sales-types";
import { SupabaseSalesRepository } from "@/repositories/sales/supabase-sales-repository";

let repository: SalesRepository | null = null;

export function getSalesRepository(): SalesRepository {
  if (repository) return repository;
  const mode = process.env.NEXT_PUBLIC_SALES_STORAGE_MODE ?? "local";
  if (mode === "local") repository = new LocalStorageSalesRepository();
  else if (mode === "supabase") repository = new SupabaseSalesRepository();
  else throw new SalesRepositoryError("CONFIGURATION", "NEXT_PUBLIC_SALES_STORAGE_MODE는 local 또는 supabase여야 합니다.");
  return repository;
}
