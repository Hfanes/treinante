import { NextResponse } from "next/server";

import {
  STRAVA_STATE_COOKIE,
  STRAVA_STATE_COOKIE_OPTIONS,
} from "@/lib/strava-oauth";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings?strava=missing_client_id", request.url)
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/strava/callback", request.url);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri.toString(),
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  });
  const response = NextResponse.redirect(
    `https://www.strava.com/oauth/authorize?${params}`
  );
  response.cookies.set(STRAVA_STATE_COOKIE, state, STRAVA_STATE_COOKIE_OPTIONS);
  return response;
}
