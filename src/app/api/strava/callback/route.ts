import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerClient } from "@/lib/supabase-server";
import { syncStravaRuns } from "@/lib/stravaClient";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?strava=missing_code", request.url)
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
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
    return NextResponse.redirect(
      new URL("/settings?strava=exchange_failed", request.url)
    );
  }

  const token = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  const admin = createAdminClient();

  await admin
    .from("strava_tokens")
    .upsert({
      user_id: user.id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
    })
    .throwOnError();
  await admin
    .from("profiles")
    .update({ strava_connected: true })
    .eq("id", user.id)
    .throwOnError();

  const imported = await syncStravaRuns(user.id).catch(() => null);
  if (!imported) {
    return NextResponse.redirect(
      new URL("/settings?strava=connected&sync=failed", request.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/settings?strava=connected&synced=${imported.length}`, request.url)
  );
}
