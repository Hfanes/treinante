create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  weekly_km_goal numeric not null default 30,
  max_hr integer,
  resting_hr integer,
  ftp_pace integer,
  strava_connected boolean not null default false,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamptz,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
  for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke execute on function public.handle_new_user() from anon, authenticated, public;
