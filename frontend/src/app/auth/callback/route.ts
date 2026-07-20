import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getSafeInternalPath } from "@/lib/supabase/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const next = getSafeInternalPath(request.nextUrl.searchParams.get("next"));
  const otpTypes: readonly EmailOtpType[] = [
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ];
  const type = otpTypes.find((candidate) => candidate === rawType);

  if (code || (tokenHash && type)) {
    try {
      const supabase = await createClient();
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
      if (!error) return NextResponse.redirect(new URL(next === "/" ? "/onboarding/business" : next, request.url));
    } catch {
      // Redirect below without exposing provider details.
    }
  }
  return NextResponse.redirect(new URL("/login?error=auth-callback", request.url));
}
