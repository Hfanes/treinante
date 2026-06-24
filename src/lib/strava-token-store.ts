import { createAdminClient } from "@/lib/supabase-admin";

export const STRAVA_ACCOUNT_ALREADY_LINKED =
  "This Strava account is already linked to another Treinante account. Log out and continue with Strava, or disconnect it from the other account first.";

export interface StravaAthlete {
  id: number;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
}

export function stravaAthleteName(athlete: StravaAthlete | null) {
  if (!athlete) return null;

  const fullName = [athlete.firstname, athlete.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || athlete.username || null;
}

export async function fetchStravaAthlete(accessToken: string) {
  const response = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Strava athlete lookup failed with ${response.status}`);
  }

  return (await response.json()) as StravaAthlete;
}

export async function storeStravaConnection({
  accessToken,
  athlete,
  expiresAt,
  refreshToken,
  userId,
}: {
  accessToken: string;
  athlete: StravaAthlete;
  expiresAt: string;
  refreshToken: string;
  userId: string;
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("strava_tokens")
    .select("user_id")
    .eq("strava_athlete_id", athlete.id)
    .maybeSingle();

  if (existing && existing.user_id !== userId) {
    throw new Error(STRAVA_ACCOUNT_ALREADY_LINKED);
  }

  const isNewConnection = !existing;

  const { error } = await admin.from("strava_tokens").upsert({
    user_id: userId,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    strava_athlete_id: athlete.id,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(STRAVA_ACCOUNT_ALREADY_LINKED);
    }

    throw error;
  }

  await admin
    .from("profiles")
    .update({
      strava_connected: true,
      strava_athlete_name: stravaAthleteName(athlete),
    })
    .eq("id", userId)
    .throwOnError();

  return { isNewConnection };
}
