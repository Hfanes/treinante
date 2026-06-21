import { createAdminClient } from "@/lib/supabase-admin";
import { recalculateFitnessSnapshots } from "@/lib/calculations";
import { recalculatePersonalRecords } from "@/lib/prExtractor";
import { recalculateWeeklyReports } from "@/lib/reportEngine";
import type { Run, Split } from "@/types";
import type { TablesInsert } from "@/types/supabase";

type RunInsert = TablesInsert<"runs">;
const STRAVA_UPSERT_BATCH_SIZE = 25;

interface StravaActivity {
  id: number;
  name: string | null;
  type: string;
  sport_type?: string;
  start_date: string;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  max_watts?: number;
  total_elevation_gain?: number;
  start_latlng?: [number, number] | null;
  end_latlng?: [number, number] | null;
  map?: { summary_polyline?: string | null };
}

interface StravaStream<T> {
  type: string;
  data: T[];
}

type StravaStreamsResponse =
  | StravaStream<unknown>[]
  | Record<string, { data?: unknown[] }>;

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class StravaRateLimitError extends Error {
  constructor() {
    super("Strava rate limit reached. Try again later.");
  }
}

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function stravaFetch<T>(path: string, accessToken: string) {
  let response = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status >= 500) {
    response = await fetch(`https://www.strava.com/api/v3${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  if (!response.ok) {
    if (response.status === 429) throw new StravaRateLimitError();

    const text = await response.text();
    throw new Error(
      text.trim()
        ? `Strava API failed with ${response.status}: ${text}`
        : `Strava API failed with ${response.status}`
    );
  }

  return (await response.json()) as T;
}

export async function refreshStravaToken(userId: string) {
  const admin = createAdminClient();
  const { data: token, error } = await admin
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !token) throw new Error("Strava is not connected");

  if (new Date(token.expires_at).getTime() > Date.now() + 5 * 60 * 1000) {
    return token.access_token;
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("NEXT_PUBLIC_STRAVA_CLIENT_ID"),
      client_secret: env("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Strava token refresh failed with ${response.status}`);
  }

  const nextToken = (await response.json()) as StravaTokenResponse;
  await admin
    .from("strava_tokens")
    .update({
      access_token: nextToken.access_token,
      refresh_token: nextToken.refresh_token,
      expires_at: new Date(nextToken.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .throwOnError();

  return nextToken.access_token;
}

function normalizeStreams(
  response: StravaStreamsResponse
): StravaStream<unknown>[] {
  if (Array.isArray(response)) {
    return response.filter(
      (stream): stream is StravaStream<unknown> =>
        typeof stream.type === "string" && Array.isArray(stream.data)
    );
  }

  return Object.entries(response)
    .filter(([, stream]) => Array.isArray(stream.data))
    .map(([type, stream]) => ({ type, data: stream.data ?? [] }));
}

function streamMap(streams: StravaStream<unknown>[]) {
  return Object.fromEntries(
    streams.map((stream) => [stream.type, stream.data])
  );
}

function computeStreamSplits(
  streams: StravaStream<unknown>[],
  startDate: string
) {
  const map = streamMap(streams) as {
    distance?: number[];
    time?: number[];
    heartrate?: number[];
    altitude?: number[];
    latlng?: [number, number][];
  };
  const distances = map.distance ?? [];
  const times = map.time ?? [];
  const splits: Split[] = [];
  let nextKm = 1;
  let splitStartIndex = 0;

  for (let index = 0; index < distances.length; index += 1) {
    if (distances[index] < nextKm * 1000) continue;

    const hrSlice = map.heartrate?.slice(splitStartIndex, index + 1) ?? [];
    const elapsed = times[index] - (times[splitStartIndex] ?? 0);
    const latlng = map.latlng?.[index];
    splits.push({
      km: nextKm,
      pace: Math.max(1, Math.round(elapsed)),
      hr: hrSlice.length
        ? Math.round(
            hrSlice.reduce((sum, value) => sum + value, 0) / hrSlice.length
          )
        : null,
      elevation: Math.round(map.altitude?.[index] ?? 0),
      gap: Math.max(1, Math.round(elapsed)),
      is_stop: elapsed > 540,
      lat: latlng?.[0] ?? null,
      lng: latlng?.[1] ?? null,
      timestamp: new Date(
        new Date(startDate).getTime() + times[index] * 1000
      ).toISOString(),
    });
    splitStartIndex = index;
    nextKm += 1;
  }

  return splits;
}

function mapActivityToRun(
  userId: string,
  activity: StravaActivity,
  streams: StravaStream<unknown>[]
): Run {
  const now = new Date().toISOString();
  const distanceKm = activity.distance / 1000;
  const streamSummary = Object.fromEntries(
    streams.map((stream) => [stream.type, stream.data.length])
  );
  const streamData = streamMap(streams) as { altitude?: number[] };

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title: activity.name,
    date: activity.start_date.slice(0, 10),
    start_time: activity.start_date,
    source: "strava",
    sport_type: activity.sport_type ?? activity.type,
    strava_activity_id: activity.id,
    distance: Number(distanceKm.toFixed(3)),
    total_time: activity.elapsed_time,
    moving_time: activity.moving_time,
    avg_hr: activity.average_heartrate
      ? Math.round(activity.average_heartrate)
      : null,
    max_hr: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
    avg_power: activity.average_watts
      ? Math.round(activity.average_watts)
      : null,
    max_power: activity.max_watts ? Math.round(activity.max_watts) : null,
    elevation_gain: activity.total_elevation_gain ?? 0,
    elevation_loss: 0,
    avg_pace: Math.round(activity.moving_time / Math.max(distanceKm, 0.001)),
    start_lat: activity.start_latlng?.[0] ?? null,
    start_lng: activity.start_latlng?.[1] ?? null,
    end_lat: activity.end_latlng?.[0] ?? null,
    end_lng: activity.end_latlng?.[1] ?? null,
    summary_polyline: activity.map?.summary_polyline ?? null,
    gpx_file_url: null,
    raw_splits: computeStreamSplits(streams, activity.start_date),
    raw_source: {
      activity,
      stream_summary: streamSummary,
      start_elevation: streamData.altitude?.[0] ?? null,
    } as unknown as Record<string, unknown>,
    training_load: null,
    ctl_at_date: null,
    atl_at_date: null,
    tsb_at_date: null,
    created_at: now,
    updated_at: now,
  };
}

export async function syncStravaRuns(
  userId: string,
  options: { fullHistory?: boolean } = {}
): Promise<Run[]> {
  const admin = createAdminClient();
  const accessToken = await refreshStravaToken(userId);
  const { data: existingRuns } = await admin
    .from("runs")
    .select("strava_activity_id,date")
    .eq("user_id", userId)
    .eq("source", "strava");
  const existingIds = new Set(
    (existingRuns ?? [])
      .map((run) => run.strava_activity_id)
      .filter((id): id is number => id !== null)
  );
  const latestDate = (existingRuns ?? [])
    .map((run) => run.date)
    .sort()
    .at(-1);
  const after =
    latestDate && !options.fullHistory
      ? Math.floor(new Date(`${latestDate}T00:00:00Z`).getTime() / 1000)
      : null;
  const imported: Run[] = [];

  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      per_page: "100",
      page: String(page),
    });
    if (after) params.set("after", String(after));

    const activities = await stravaFetch<StravaActivity[]>(
      `/athlete/activities?${params}`,
      accessToken
    );
    if (activities.length === 0) break;

    for (const activity of activities) {
      if (
        (activity.type !== "Run" && activity.sport_type !== "Run") ||
        existingIds.has(activity.id)
      ) {
        continue;
      }

      const streamsResponse = await stravaFetch<StravaStreamsResponse>(
        `/activities/${activity.id}/streams?keys=distance,time,heartrate,altitude,latlng&key_by_type=true`,
        accessToken
      ).catch(() => []);
      const streams = normalizeStreams(streamsResponse);
      imported.push(mapActivityToRun(userId, activity, streams));
      existingIds.add(activity.id);
    }
  }

  if (imported.length > 0) {
    for (
      let index = 0;
      index < imported.length;
      index += STRAVA_UPSERT_BATCH_SIZE
    ) {
      const batch = imported.slice(index, index + STRAVA_UPSERT_BATCH_SIZE);
      await admin
        .from("runs")
        .upsert(batch as unknown as RunInsert[])
        .throwOnError();
    }
  }

  await recalculatePersonalRecords(admin, userId);
  await recalculateFitnessSnapshots(admin, userId);
  await recalculateWeeklyReports(admin, userId);

  return imported;
}
