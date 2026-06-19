create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  date date not null,
  start_time timestamptz,
  source text not null check (source in ('gpx', 'strava', 'manual')),
  sport_type text,
  strava_activity_id bigint,
  distance numeric not null,
  total_time integer not null,
  moving_time integer not null,
  avg_hr integer,
  max_hr integer,
  avg_power integer,
  max_power integer,
  elevation_gain numeric not null default 0,
  elevation_loss numeric not null default 0,
  avg_pace integer not null,
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  summary_polyline text,
  gpx_file_url text,
  raw_splits jsonb not null default '[]'::jsonb,
  raw_source jsonb not null default '{}'::jsonb,
  training_load numeric,
  ctl_at_date numeric,
  atl_at_date numeric,
  tsb_at_date numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index runs_user_date on public.runs(user_id, date desc);
create unique index runs_user_strava_activity_id on public.runs(user_id, strava_activity_id)
  where strava_activity_id is not null;

alter table public.runs enable row level security;

create policy "own runs" on public.runs
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger runs_updated_at
  before update on public.runs
  for each row execute procedure public.touch_updated_at();

revoke execute on function public.touch_updated_at() from anon, authenticated, public;

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    '400m', 'half_mile', '1k', '1_mile', '2_mile', '5k', '10k', '15k',
    '10_mile', '20k', 'half_marathon', '30k', 'marathon',
    '50k', '50_mile', '100k', '100_mile', '200k', '24h', '48h',
    'longest_run', 'longest_duration', 'most_elevation', 'best_d_plus_per_km'
  )),
  value numeric not null,
  run_id uuid references public.runs(id) on delete set null,
  achieved_at date,
  updated_at timestamptz not null default now(),
  unique(user_id, type)
);

alter table public.personal_records enable row level security;

create policy "own prs" on public.personal_records
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger personal_records_updated_at
  before update on public.personal_records
  for each row execute procedure public.touch_updated_at();

create table public.segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  created_at timestamptz not null default now()
);

create index segments_user_created_at on public.segments(user_id, created_at desc);

alter table public.segments enable row level security;

create policy "own segments" on public.segments
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.segment_efforts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  segment_id uuid not null references public.segments(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  elapsed_time integer not null,
  avg_hr integer,
  date date not null
);

create index efforts_segment on public.segment_efforts(segment_id, date desc);
create index efforts_user_date on public.segment_efforts(user_id, date desc);

alter table public.segment_efforts enable row level security;

create policy "own efforts" on public.segment_efforts
  for all
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.segments
      where segments.id = segment_efforts.segment_id
        and segments.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.runs
      where runs.id = segment_efforts.run_id
        and runs.user_id = (select auth.uid())
    )
  );

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  zone_breakdown jsonb,
  insight_text text,
  generated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

alter table public.weekly_reports enable row level security;

create policy "own reports" on public.weekly_reports
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
