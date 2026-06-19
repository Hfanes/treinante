# PRD 02 — Data Layer: Supabase Schema, IndexedDB Cache, Sync & Export

## Overview

Supabase PostgreSQL is the source of truth. IndexedDB provides a local write-through cache for instant reads and offline capability after first load. Every table uses row-level security — users can only access their own rows. All mutations go through Supabase first, then IndexedDB.

---

## Full Supabase schema

```sql
-- profiles: see PRD 01

create table runs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  source text not null check (source in ('gpx','strava','manual')),
  strava_activity_id bigint unique,
  distance numeric not null,           -- km
  total_time integer not null,         -- seconds
  moving_time integer,                 -- seconds
  avg_hr integer,
  max_hr integer,
  elevation_gain numeric default 0,    -- metres D+
  elevation_loss numeric default 0,    -- metres D-
  avg_pace integer not null,           -- sec/km
  gpx_file_url text,
  raw_splits jsonb default '[]',       -- Split[] stored as JSON
  training_load numeric,
  ctl_at_date numeric,
  atl_at_date numeric,
  tsb_at_date numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index runs_user_date on runs(user_id, date desc);

alter table runs enable row level security;
create policy "own runs" on runs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to keep updated_at current
create or replace function touch_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger runs_updated_at before update on runs
  for each row execute procedure touch_updated_at();

-- personal_records: one row per user per type, upserted on each import
create table personal_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in (
    '400m','half_mile','1k','1_mile','2_mile','5k','10k','15k',
    '10_mile','20k','half_marathon','30k','marathon',
    '50k','50_mile','100k','100_mile','200k','24h','48h',
    'longest_run','longest_duration','most_elevation','best_d_plus_per_km'
  )),
  value numeric not null,
  run_id uuid references runs(id) on delete set null,
  achieved_at date,
  updated_at timestamptz default now(),
  unique(user_id, type)
);

alter table personal_records enable row level security;
create policy "own prs" on personal_records
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- segments
create table segments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  distance numeric,
  best_time integer,
  best_date date,
  kom_time integer,
  strava_segment_id bigint,
  created_at timestamptz default now()
);

alter table segments enable row level security;
create policy "own segments" on segments
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- segment_efforts
create table segment_efforts (
  id uuid default gen_random_uuid() primary key,
  segment_id uuid references segments(id) on delete cascade not null,
  run_id uuid references runs(id) on delete cascade not null,
  elapsed_time integer not null,
  avg_hr integer,
  date date not null
);

create index efforts_segment on segment_efforts(segment_id, date desc);

alter table segment_efforts enable row level security;
create policy "own efforts" on segment_efforts
  using (
    auth.uid() = (select user_id from segments where id = segment_id)
  );

-- weekly_reports
create table weekly_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,
  total_km numeric,
  total_d_plus numeric,
  total_time integer,
  num_runs integer,
  avg_pace integer,
  avg_hr integer,
  ctl_end numeric,
  atl_end numeric,
  tsb_end numeric,
  vs_prev_km_delta numeric,
  vs_prev_d_plus_delta numeric,
  vs_prev_time_delta integer,
  zone_breakdown jsonb,          -- { z2: 60, z3: 30, z4: 10 }
  insight_text text,
  generated_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table weekly_reports enable row level security;
create policy "own reports" on weekly_reports
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## IndexedDB schema (`/src/lib/idb.ts`)

```typescript
import { openDB, DBSchema } from "idb";

interface RunDB extends DBSchema {
  runs: {
    key: string;
    value: Run;
    indexes: { by_date: string; by_user: string };
  };
  personal_records: {
    key: string;
    value: PersonalRecord;
    indexes: { by_user_type: [string, string] };
  };
  segments: { key: string; value: Segment };
  segment_efforts: {
    key: string;
    value: SegmentEffort;
    indexes: { by_segment: string };
  };
  weekly_reports: {
    key: string;
    value: WeeklyReport;
    indexes: { by_week: string };
  };
  sync_meta: { key: string; value: { key: string; value: string } };
}

export const db = openDB<RunDB>("treinante", 1, {
  upgrade(db) {
    const runs = db.createObjectStore("runs", { keyPath: "id" });
    runs.createIndex("by_date", "date");
    runs.createIndex("by_user", "user_id");

    const prs = db.createObjectStore("personal_records", { keyPath: "id" });
    prs.createIndex("by_user_type", ["user_id", "type"], { unique: true });

    db.createObjectStore("segments", { keyPath: "id" });

    const efforts = db.createObjectStore("segment_efforts", { keyPath: "id" });
    efforts.createIndex("by_segment", "segment_id");

    const reports = db.createObjectStore("weekly_reports", { keyPath: "id" });
    reports.createIndex("by_week", "week_start");

    db.createObjectStore("sync_meta", { keyPath: "key" });
  },
});
```

---

## Sync strategy

### On app load (`useRuns` hook)

1. Immediately read from IndexedDB → render UI (instant, no loading state for cached data)
2. Check `sync_meta.last_sync` timestamp
3. Fetch from Supabase: all rows with `updated_at > last_sync`
4. Upsert into IndexedDB
5. Update `sync_meta.last_sync = now()`
6. Re-render with any new/updated data

### On mutation (new run, delete run)

Write-through: Supabase first → IndexedDB on success. On Supabase failure, show error toast, do not write to IndexedDB.

### Initial load (no cache yet)

Fetch all user data from Supabase, populate IndexedDB, render. Show skeleton UI while this happens.

---

## Next.js server component initial fetch

For the dashboard and run list pages, fetch initial data on the server to avoid a client-side loading state on first render:

```typescript
// /src/app/(dashboard)/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .order('date', { ascending: false })
    .limit(100)

  // Pass as initial data to client component
  // Client component hydrates IndexedDB from this on first render
  return <DashboardClient initialRuns={runs ?? []} />
}
```

This means the first render has real data — no skeleton flash on initial load.

---

## Export / Import

### JSON export

From Settings. Downloads all user data as a single `.json` file.

```typescript
interface ExportFile {
  exported_at: string;
  version: 2;
  profile: Partial<Profile>;
  runs: Run[];
  personal_records: PersonalRecord[];
  segments: Segment[];
  segment_efforts: SegmentEffort[];
  weekly_reports: WeeklyReport[];
}
```

Reads from IndexedDB (no Supabase call needed). Triggers `<a download>` with JSON blob.

### JSON import

Upload a previously exported file:

1. Parse + validate structure and version
2. Show preview: "42 runs, 3 segments — will merge with existing data"
3. Confirm dialog
4. Upsert all rows to Supabase (by id — no duplicates)
5. Re-sync IndexedDB
6. Re-run post-import pipeline (PRs, fitness, segments, reports)
7. Toast: "Import complete — 42 runs added"

Runs with the same `id` or `strava_activity_id` are updated, not duplicated.

---

## useRuns hook API

```typescript
const {
  runs, // Run[] sorted by date desc, from IndexedDB
  loading, // initial sync in progress
  syncing, // background re-sync in progress
  addRun, // (run: Run) => Promise<void>
  deleteRun, // (id: string) => Promise<void>
  getRun, // (id: string) => Run | undefined
  exportJSON, // () => void
  importJSON, // (file: File) => Promise<void>
} = useRuns();
```
