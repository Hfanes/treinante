# PRD 03 — Run Import: GPX, Strava OAuth, Manual Entry

## Overview

Three ways to import runs. All three normalise to the same `Run` type before writing to storage. After any import, a post-import pipeline fires automatically: PR recalculation, fitness update, segment matching, weekly report refresh.

---

## Source 1 — GPX file upload

### User flow

1. Click "Import GPX" (Runs page header or empty state)
2. File picker — accepts `.gpx` only, multiple files supported
3. Files parsed client-side — no server round-trip
4. Preview card per file: name, distance, time, elevation
5. Confirm → write run to Supabase, upload GPX to Supabase Storage at `gpx/{user_id}/{run_id}.gpx`
6. Toast: "Run imported — 8.3 km · 42:15"

### GPX parser (`/src/lib/gpxParser.ts`)

Input: GPX XML string. Output: normalised `Run` object.

**Fields extracted:**

```
distance        haversine sum of consecutive <trkpt> lat/lng points (km)
total_time      last trkpt time − first trkpt time (seconds)
moving_time     total_time minus gaps > 60s between consecutive points
avg_hr          mean of all <gpxtpx:hr> values
max_hr          max of all <gpxtpx:hr> values
elevation_gain  sum of positive elevation deltas — smooth with 5-point rolling avg first (D+)
elevation_loss  sum of negative elevation deltas (D-)
avg_pace        moving_time / distance
raw_splits      computed per-km (see below)
```

**Per-km split computation:**

Iterate trackpoints, accumulate distance. At each 1 km threshold:

- `pace` — elapsed moving time for that km segment (sec/km)
- `hr` — mean HR across all points in this km
- `elevation` — elevation at the km boundary (interpolated)
- `gap` — grade adjusted pace (see PRD 04)
- `is_stop` — pace > 540 sec/km
- `lat`, `lng` — coordinates at the km boundary (for segment matching)

**Edge cases:**

- No HR data → all HR fields null, GAP uses elevation only
- No elevation data → elevation fields 0, GAP equals pace
- < 0.5 km → warn but allow import
- Multiple `<trk>` segments → concatenate as single activity
- Single trackpoint → reject: "GPX file contains no track data"

```typescript
// /src/lib/gpxParser.ts
export function parseGPX(
  xmlString: string
): Omit<Run, "id" | "user_id" | "created_at"> {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  const trackpoints = [...doc.querySelectorAll("trkpt")];
  // ... extraction and normalisation
}
```

---

## Source 2 — Strava OAuth

### OAuth flow (Next.js Route Handlers)

**Step 1 — Authorise (client-side redirect)**

```typescript
// /src/components/StravaConnectButton.tsx
const stravaAuthUrl =
  `https://www.strava.com/oauth/authorize?` +
  `client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}` +
  `&redirect_uri=${window.location.origin}/api/strava/callback` +
  `&response_type=code` +
  `&scope=activity:read_all`;

window.location.href = stravaAuthUrl;
```

**Step 2 — Callback Route Handler**

```typescript
// /src/app/api/strava/callback/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Exchange code for tokens — client_secret stays server-side
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  const { access_token, refresh_token, expires_at } = await tokenRes.json();

  // Get current user and store tokens in profiles
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("profiles")
    .update({
      strava_connected: true,
      strava_access_token: access_token,
      strava_refresh_token: refresh_token,
      strava_token_expires_at: new Date(expires_at * 1000).toISOString(),
    })
    .eq("id", user!.id);

  return NextResponse.redirect(new URL("/settings?strava=connected", req.url));
}
```

**Step 3 — Token refresh Route Handler**

```typescript
// /src/app/api/strava/refresh/route.ts
// Called automatically by stravaClient.ts when token is expired
// Exchanges refresh_token for new access_token, updates profiles row
```

### Fetching activities (`/src/lib/stravaClient.ts`)

- **Initial import:** Last 365 days of activities on first connect
- **Incremental sync:** Activities after `max(runs.date)` for Strava-sourced runs
- **Filter:** Only `type: 'Run'` activities
- **Splits:** Fetch from `/activities/{id}/streams?keys=distance,time,heartrate,altitude,latlng`
- **Deduplication:** Skip if `strava_activity_id` already exists

**Field mapping:**

| Strava                 | Run                  |
| ---------------------- | -------------------- |
| `start_date`           | `date`               |
| `distance / 1000`      | `distance`           |
| `elapsed_time`         | `total_time`         |
| `moving_time`          | `moving_time`        |
| `average_heartrate`    | `avg_hr`             |
| `max_heartrate`        | `max_hr`             |
| `total_elevation_gain` | `elevation_gain`     |
| `id`                   | `strava_activity_id` |

### Strava UI (Settings → Integrations)

- Not connected: "Connect Strava" button → starts OAuth flow
- Connected: athlete name, "Sync now" button, "Disconnect" button
- "Sync now" → incremental fetch with spinner + count: "Synced 4 new runs"
- Disconnect: clears tokens from `profiles`, does not delete existing runs

---

## Source 3 — Manual entry

A form accessible from "Add run" dropdown anywhere in the app.

**Fields:**

| Field          | Type        | Required |
| -------------- | ----------- | -------- |
| Date           | date picker | ✓        |
| Distance       | number (km) | ✓        |
| Total time     | HH:MM:SS    | ✓        |
| Moving time    | HH:MM:SS    | —        |
| Avg HR         | number      | —        |
| Max HR         | number      | —        |
| Elevation gain | number (m)  | —        |
| Elevation loss | number (m)  | —        |
| Notes          | textarea    | —        |

Manual runs have no `raw_splits`. Features requiring splits (split chart, GAP, segment matching) show "No split data — import a GPX file for full analysis."

---

## Post-import pipeline

Runs after every successful import (any source):

```typescript
// /src/lib/postImport.ts
export async function runPostImportPipeline(run: Run, userId: string) {
  await recalculateFitness(userId); // PRD 07 — ATL/CTL/TSB
  await extractAndUpdatePRs(run, userId); // PRD 06 — PR check
  await matchSegments(run, userId); // PRD 09 — segment matching
  await regenerateWeeklyReport(userId, run.date); // PRD 10 — report update
}
```

Non-blocking — runs in the background after the import toast fires. UI updates progressively as each step completes.

---

## Run history table (`/runs`)

| Column   | Notes                                    |
| -------- | ---------------------------------------- |
| Date     | sortable                                 |
| Distance | sortable, km                             |
| Time     | moving time                              |
| Pace     | sortable, MM:SS/km                       |
| Avg HR   | sortable, null shown as —                |
| D+       | elevation gain, hidden if all runs are 0 |
| Source   | GPX / Strava / Manual icon               |
| Actions  | View, Delete                             |

- Sortable by all columns
- Filter by source, date range
- Row click → `/runs/[id]`
- Delete: confirm dialog → deletes run + re-runs pipeline to recalculate PRs/fitness
- Pagination: 25 per page

**Adaptive columns:** The D+ column is only shown if at least one run in the user's history has elevation data > 0. This keeps the table clean for road runners who don't record elevation.
