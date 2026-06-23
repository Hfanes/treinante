import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import {
  STRAVA_STATE_COOKIE,
  STRAVA_STATE_COOKIE_OPTIONS,
} from "@/lib/strava-oauth";
import { storeStravaConnection } from "@/lib/strava-token-store";
import { syncStravaRuns } from "@/lib/stravaClient";

function redirectWithClearedState(path: string, request: NextRequest) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(STRAVA_STATE_COOKIE, "", {
    ...STRAVA_STATE_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STRAVA_STATE_COOKIE)?.value;

  if (!state || !expectedState || state !== expectedState) {
    return redirectWithClearedState("/settings?strava=invalid_state", request);
  }

  if (!code) {
    return redirectWithClearedState("/settings?strava=missing_code", request);
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithClearedState("/login", request);
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    return redirectWithClearedState(
      "/settings?strava=exchange_failed",
      request
    );
  }

  const token = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: {
      id: number;
      firstname?: string | null;
      lastname?: string | null;
      username?: string | null;
    };
  };

  if (!token.athlete?.id) {
    return redirectWithClearedState(
      "/settings?strava=missing_athlete",
      request
    );
  }

  try {
    await storeStravaConnection({
      userId: user.id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(token.expires_at * 1000).toISOString(),
      athlete: token.athlete,
    });
  } catch {
    return redirectWithClearedState("/settings?strava=already_linked", request);
  }

  const imported = await syncStravaRuns(user.id).catch(() => null);
  if (!imported) {
    return redirectWithClearedState(
      "/settings?strava=connected&sync=failed",
      request
    );
  }

  return redirectWithClearedState(
    `/settings?strava=connected&synced=${imported.length}`,
    request
  );
}
