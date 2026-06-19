# PRD 13 — High-Resolution Run Streams

## Overview

Add high-resolution per-run stream storage for detailed charts on individual run pages. The app currently stores `runs.raw_splits` as per-kilometer summaries. That is enough for tables, summaries, records, and lightweight analytics, but not enough for continuous elevation, pace, and heart-rate traces like watch/Strava-style activity charts.

This PRD adds detailed run streams as a separate, lazily loaded detail payload while keeping the existing `runs` table lightweight.

---

## Goals

- Store detailed run stream points for GPX and Strava imports.
- Keep existing per-km `raw_splits` for summaries and tables.
- Load stream data only on `/runs/[id]`.
- Render smoother elevation, pace, GAP, and HR charts from stream data.
- Display a route map on individual run pages when coordinate streams exist.
- Downsample data before chart rendering to protect browser performance.
- Preserve privacy and ownership through Supabase RLS.

---

## Non-Goals

- Do not add segment matching in this PRD.
- Do not add heatmaps or route search in this PRD.
- Do not add map-based route editing, route planning, or public route sharing in this PRD.
- Do not replace `raw_splits`; they remain the compact summary source.
- Do not load stream payloads on dashboard, run list, records, reports, or fitness pages.

---

## Data Model

### New Table: `run_streams`

One row per run.

```sql
create table public.run_streams (
  run_id uuid primary key references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  distance_m integer[] not null default '{}',
  elapsed_s integer[] not null default '{}',
  elevation_m real[] not null default '{}',
  heartrate_bpm integer[] not null default '{}',
  latitude real[] not null default '{}',
  longitude real[] not null default '{}',
  source text not null check (source in ('gpx', 'strava')),
  sample_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### RLS

- Users can select their own stream rows.
- Users can insert/update/delete their own stream rows through app flows.
- Service-role import jobs can write streams server-side.

Suggested policies should mirror existing `runs` ownership policies.

### Why Arrays Instead Of One Row Per Point

Charts need sequential data for a single run. We do not yet need point-level querying across all runs. One compressed row per run keeps row counts low, import/delete simpler, and detail loading predictable.

If future PRD 09 segment matching needs point-level geospatial queries, revisit whether to derive a `run_points` table or add a specialized route index.

---

## Import Pipeline

### GPX Imports

When parsing GPX:

- Continue generating `raw_splits` exactly as today.
- Also build a stream payload from trackpoints:
  - cumulative `distance_m`
  - cumulative `elapsed_s`
  - smoothed `elevation_m`
  - `heartrate_bpm` when present
  - `latitude`
  - `longitude`
- Store the payload in `run_streams` after the corresponding `runs` row is saved.

### Strava Imports

When importing from Strava streams:

- Continue generating `raw_splits` exactly as today.
- Store full Strava stream arrays in `run_streams`:
  - `distance`
  - `time`
  - `altitude`
  - `heartrate`
  - `latlng`
- Normalize units and lengths before insert.

### Existing Runs

Existing runs do not have stream data.

Supported behavior:

- `/runs/[id]` falls back to `raw_splits` when no `run_streams` row exists.
- Strava full-history resync should update/replace existing Strava run stream rows instead of skipping existing activities.
- GPX runs can only be backfilled if the original GPX file is still available in storage.

---

## Stream Normalization

Create a shared stream shape in `src/types/index.ts` or a dedicated run-stream module.

```ts
export interface RunStream {
  run_id: string;
  distance_m: number[];
  elapsed_s: number[];
  elevation_m: number[];
  heartrate_bpm: Array<number | null>;
  latitude: Array<number | null>;
  longitude: Array<number | null>;
  source: "gpx" | "strava";
  sample_count: number;
}
```

All arrays must describe the same ordered sample sequence. If a source omits HR or coordinates for a point, store `null` in the normalized TypeScript shape and serialize to the database representation consistently.

---

## Downsampling

Charts should never render unbounded stream arrays directly.

Rules:

- Target max chart points: `800`.
- Preserve first and last points.
- Preserve visible spikes better than naive every-N sampling.
- Prefer Largest-Triangle-Three-Buckets style downsampling if implementation stays small; otherwise use bucket min/max preservation.
- Downsample in server code or a pure utility before passing data to client chart components.

---

## Run Detail UI

On `/runs/[id]`:

- Load `run_streams` for that run when present.
- Use stream data for the main activity chart.
- Display a route map when latitude/longitude stream data exists.
- Fall back to analyzed per-km splits when stream data is missing.
- Keep the existing per-km splits table unchanged except where stream-derived values are explicitly needed.

Chart behavior:

- Elevation profile always visible when elevation data exists.
- Pace toggle overlays pace trace.
- GAP toggle or dashed companion line appears when pace is enabled and elevation exists.
- Heart-rate toggle overlays HR trace when HR data exists.
- Average values below the chart should use whole-run summary fields, not stream averages, unless explicitly stated.

Map behavior:

- Show a route map only on `/runs/[id]` and only when coordinate stream data exists.
- Preserve the PRD 12 visual system: dark map style, no shadows, 2px radius, sand route line, minimal controls.
- Use a lightweight map renderer such as MapLibre GL or Leaflet, chosen during implementation based on bundle size and setup complexity.
- Fit bounds to the route on initial render.
- Show start and finish markers.
- Do not render a map for manual runs or imports without coordinates; show no empty placeholder unless useful explanatory copy is needed.
- Keep map data private to the authenticated owner; do not expose map payloads in public pages or metadata.
- If exact route privacy becomes a product concern, add a future option to hide or crop start/end areas; do not implement cropping in this PRD unless required.

---

## Performance

- Query stream data only on `/runs/[id]`.
- Do not include stream arrays in `useRuns`, dashboard queries, reports, or list pages.
- Keep stream payload insert/update batched with run import where practical.
- Add a defensive chart render cap even if server downsampling fails.
- Downsample map polylines separately from charts if needed, targeting smooth display without sending unnecessary points to the browser.
- Avoid storing duplicate full GPX XML in the database; keep file storage for raw GPX where needed.

---

## Privacy & Security

Full streams can reveal exact routes and home/work locations.

Requirements:

- RLS must restrict stream rows to the owning user.
- Do not expose stream data through public routes.
- Treat latitude/longitude streams as sensitive route data.
- Do not log stream payloads.
- Export/delete account flows must include stream data once those flows exist.

---

## Acceptance Criteria

- A migration creates `run_streams` with RLS policies.
- New GPX imports store a `run_streams` row.
- New Strava imports store a `run_streams` row.
- Strava full-history resync refreshes stream rows for existing Strava activities.
- `/runs/[id]` uses stream data for the main chart when available.
- `/runs/[id]` displays a private route map when coordinate stream data is available.
- `/runs/[id]` falls back to per-km splits when stream data is unavailable.
- `/runs/[id]` hides the map when coordinate stream data is unavailable.
- Charts render at a capped point count and remain responsive on mobile.
- Route maps render responsively on mobile and do not load on pages outside individual run detail.
- Deleting a run deletes its stream row through cascade.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

---

## Open Questions

- Should latitude/longitude be stored from day one, or should v1 store only distance/time/elevation/HR to reduce privacy risk?
- Should GPX backfill read existing files from Supabase Storage automatically, or only rebuild streams when a user re-imports?
- Should downsampling happen in a server utility, client utility, or both?
- Should stream arrays use Postgres arrays as above, or a compressed `jsonb`/binary payload if storage size becomes a concern?
