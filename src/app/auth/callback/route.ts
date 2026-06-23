import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  LAST_LOGIN_COOKIE,
  getSafeNextPath,
  isLoginMethod,
} from "@/lib/auth-redirects";
import {
  fetchStravaAthlete,
  storeStravaConnection,
} from "@/lib/strava-token-store";
import type { Database } from "@/types/supabase";

function setLastLoginCookie(
  response: NextResponse,
  method: string | undefined
) {
  if (!isLoginMethod(method)) return;

  response.cookies.set(LAST_LOGIN_COOKIE, method, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
}

function authErrorRedirect(origin: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : "OAuth callback failed";
  const url = new URL("/login", origin);
  url.searchParams.set("error", "oauth");
  url.searchParams.set("reason", message.slice(0, 120));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error_description");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const loginMethod = requestUrl.searchParams.get("login") ?? undefined;

  if (providerError) {
    return authErrorRedirect(requestUrl.origin, new Error(providerError));
  }

  if (!code) {
    return authErrorRedirect(requestUrl.origin, new Error("Missing auth code"));
  }

  const res = NextResponse.redirect(new URL(next, requestUrl.origin));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return authErrorRedirect(
      requestUrl.origin,
      new Error("Missing Supabase environment variables")
    );
  }

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return authErrorRedirect(requestUrl.origin, error);
  }

  const isStravaLogin = loginMethod === "strava";

  if (isStravaLogin) {
    const accessToken = data.session?.provider_token;
    const refreshToken = data.session?.provider_refresh_token;

    if (!accessToken || !refreshToken || !data.user) {
      return NextResponse.redirect(
        new URL("/login?error=strava_tokens", requestUrl.origin)
      );
    }

    try {
      const athlete = await fetchStravaAthlete(accessToken);
      await storeStravaConnection({
        userId: data.user.id,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        athlete,
      });
    } catch {
      if (next === "/settings") {
        return NextResponse.redirect(
          new URL("/settings?strava=already_linked", requestUrl.origin)
        );
      }

      return NextResponse.redirect(
        new URL("/login?error=strava_linked", requestUrl.origin)
      );
    }

    if (next === "/settings") {
      const settingsResponse = NextResponse.redirect(
        new URL("/settings?strava=connected", requestUrl.origin)
      );
      setLastLoginCookie(settingsResponse, "strava");
      return settingsResponse;
    }
  }

  setLastLoginCookie(res, isStravaLogin ? "strava" : loginMethod);

  return res;
}
