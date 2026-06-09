create table public.strava_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strava_tokens enable row level security;

revoke all on table public.strava_tokens from anon, authenticated, public;

create trigger strava_tokens_updated_at
  before update on public.strava_tokens
  for each row execute procedure public.touch_updated_at();

insert into public.strava_tokens (
  user_id,
  access_token,
  refresh_token,
  expires_at
)
select
  id,
  strava_access_token,
  strava_refresh_token,
  strava_token_expires_at
from public.profiles
where strava_access_token is not null
  and strava_refresh_token is not null
  and strava_token_expires_at is not null;

alter table public.profiles
  drop column strava_access_token,
  drop column strava_refresh_token,
  drop column strava_token_expires_at;
