export type SupabaseConfigStatus =
  | { configured: true }
  | { configured: false; reason: "missing-url" | "missing-key" | "invalid-url" | "placeholder" };

export class SupabaseConfigurationError extends Error {
  constructor(public readonly reason: Exclude<SupabaseConfigStatus, { configured: true }>["reason"]) {
    super("Supabase 공개 환경변수가 올바르게 설정되지 않았습니다.");
    this.name = "SupabaseConfigurationError";
  }
}

function isPlaceholder(value: string) {
  return /PASTE_|YOUR_|PROJECT_REF|SUBSTITUTE|<|>/.test(value.toUpperCase());
}

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" && Boolean(url.hostname))
      || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}

export function inspectSupabaseConfig(urlValue: string | undefined, keyValue: string | undefined): SupabaseConfigStatus {
  const url = urlValue?.trim();
  const key = keyValue?.trim();
  if (!url) return { configured: false, reason: "missing-url" };
  if (!key) return { configured: false, reason: "missing-key" };
  if (isPlaceholder(url) || isPlaceholder(key)) return { configured: false, reason: "placeholder" };
  if (!isValidSupabaseUrl(url)) return { configured: false, reason: "invalid-url" };
  return { configured: true };
}

function readSupabaseConfigValues() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    publishableKey: (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )?.trim(),
  };
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const { url, publishableKey } = readSupabaseConfigValues();
  return inspectSupabaseConfig(url, publishableKey);
}

export function isSupabaseConfigured() {
  return getSupabaseConfigStatus().configured;
}

export function getSupabaseConfig() {
  const { url, publishableKey } = readSupabaseConfigValues();
  const status = inspectSupabaseConfig(url, publishableKey);
  if (!status.configured) throw new SupabaseConfigurationError(status.reason);

  return { url: url!, publishableKey: publishableKey! };
}
