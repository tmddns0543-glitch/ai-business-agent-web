import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(frontendRoot, ".env.local");

function readEnvironmentFile(path) {
  if (!existsSync(path)) return null;
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    values.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
  }
  return values;
}

function isPlaceholder(value) {
  return /PASTE_|YOUR_|PROJECT_REF|SUBSTITUTE|<|>/.test(value.toUpperCase());
}

function urlStatus(value) {
  if (!value) return "missing";
  if (isPlaceholder(value)) return "placeholder";
  try {
    const url = new URL(value);
    const valid = (url.protocol === "https:" && Boolean(url.hostname))
      || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
    return valid ? "configured" : "invalid";
  } catch {
    return "invalid";
  }
}

function keyStatus(value) {
  if (!value) return "missing";
  return isPlaceholder(value) ? "placeholder" : "configured";
}

const values = readEnvironmentFile(envPath);
const url = values?.get("NEXT_PUBLIC_SUPABASE_URL");
const key = values?.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  ?? values?.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const mode = values?.get("NEXT_PUBLIC_SALES_STORAGE_MODE");
const checked = {
  file: values ? "present" : "missing",
  url: urlStatus(url),
  key: keyStatus(key),
  mode: mode === "local" ? "local" : mode === "supabase" ? "supabase" : "invalid",
};

console.log(`.env.local: ${checked.file}`);
console.log(`Supabase URL: ${checked.url}`);
console.log(`Supabase publishable key: ${checked.key}`);
console.log(`Sales storage mode: ${checked.mode}`);

if (checked.url !== "configured" || checked.key !== "configured" || checked.mode !== "local") {
  console.error("Supabase 연결 설정이 아직 완료되지 않았습니다. .env.local의 placeholder를 실제 공개 설정값으로 교체하고 sales mode는 local로 유지하세요.");
  process.exitCode = 1;
} else {
  console.log("Supabase 공개 환경변수가 설정되어 있습니다. 개발 서버를 재시작하세요.");
}
