import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];
const ONBOARDING_PATH = "/onboarding/business";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let config: ReturnType<typeof getSupabaseConfig>;

  try {
    config = getSupabaseConfig();
  } catch {
    if (isPublicPath(request.nextUrl.pathname)) return response;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "configuration");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const authenticated = !error && Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (!authenticated && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated) {
    const userId = data?.claims?.sub;
    if (typeof userId !== "string") return response;
    const { data: hasBusiness, error: membershipError } = await supabase.rpc("has_current_business");

    if (!membershipError) {
      if (!hasBusiness && pathname !== ONBOARDING_PATH && !pathname.startsWith("/auth/")) {
        return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
      }
      if (hasBusiness && (pathname === ONBOARDING_PATH || pathname === "/login" || pathname === "/signup")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } else if (pathname === "/login" || pathname === "/signup") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}
