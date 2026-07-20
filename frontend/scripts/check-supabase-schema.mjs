import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function readEnv() {
  if (!existsSync(envPath)) return new Map();
  const result = new Map();
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index > 0) result.set(trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim());
  }
  return result;
}

function classify(code, message) {
  const normalizedMessage = message?.toLowerCase() ?? "";
  if (code === "42P01" || code === "PGRST205") return "relation missing";
  if (code === "42501" || normalizedMessage.includes("permission denied")) return "permission denied";
  if (code === "42P17" || normalizedMessage.includes("infinite recursion")) return "RLS recursion";
  if (normalizedMessage.includes("fetch failed")) return "connection error";
  return "database error";
}

const env = readEnv();
const url = env.get("NEXT_PUBLIC_SUPABASE_URL");
const key = env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!url || !key || /PASTE_|YOUR_|PROJECT_REF/.test(`${url}${key}`.toUpperCase())) {
  console.error("Supabase 공개 환경변수가 아직 설정되지 않았습니다.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tables = [
  ["profiles", "id,display_name,created_at,updated_at"],
  ["businesses", "id,name,owner_user_id,business_registration_number,owner_name,industry,region,status,created_at,updated_at"],
  ["business_memberships", "id,business_id,user_id,role,status,created_at"],
  ["sales", "id,business_id,business_date,platform,channel,amount,created_by"],
];
let failed = false;
for (const [table, columns] of tables) {
  const { error } = await supabase.from(table).select(columns).limit(0);
  if (error) {
    const kind = classify(error.code, error.message);
    if (kind !== "permission denied") failed = true;
    console.log(`${table}: ${kind === "permission denied" ? "protected (authentication required)" : kind} (code: ${error.code ?? "unknown"})`);
  } else {
    console.log(`${table}: reachable`);
  }
}
const { error: rpcError } = await supabase.rpc("has_current_business");
if (rpcError) {
  const kind = classify(rpcError.code, rpcError.message);
  if (kind !== "permission denied") failed = true;
  console.log(`has_current_business RPC: ${kind === "permission denied" ? "reachable (authentication required)" : kind} (code: ${rpcError.code ?? "unknown"})`);
} else {
  console.log("has_current_business RPC: reachable");
}
process.exitCode = failed ? 1 : 0;
