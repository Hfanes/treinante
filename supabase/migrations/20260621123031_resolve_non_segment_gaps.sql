alter table public.profiles
  add column if not exists strava_athlete_name text;

alter table public.personal_records
  add column if not exists estimated boolean not null default false;

create index if not exists personal_records_run_id
  on public.personal_records(run_id);

create table if not exists public.personal_record_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  value numeric not null,
  run_id uuid references public.runs(id) on delete set null,
  achieved_at date,
  estimated boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, type, run_id, achieved_at, value)
);

create index if not exists personal_record_events_user_date
  on public.personal_record_events(user_id, achieved_at desc);

create index if not exists personal_record_events_run_id
  on public.personal_record_events(run_id);

alter table public.personal_record_events enable row level security;

drop policy if exists "own pr events" on public.personal_record_events;
create policy "own pr events" on public.personal_record_events
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.personal_record_events to authenticated;
grant select, insert, update, delete on table public.personal_record_events to service_role;
