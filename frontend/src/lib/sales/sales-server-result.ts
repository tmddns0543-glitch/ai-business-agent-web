import type { Database } from "@/types/database";

export type SalesRow = Database["public"]["Tables"]["sales"]["Row"];
export type SalesServerErrorCode = "INVALID_DATA" | "NOT_FOUND" | "PERMISSION" | "CONFLICT" | "DATABASE";
export type SalesServerResult<T> = { ok: true; data: T } | { ok: false; code: SalesServerErrorCode; message: string };
