alter table public.strava_tokens
  add column strava_athlete_id bigint;

create unique index strava_tokens_strava_athlete_id_unique
  on public.strava_tokens(strava_athlete_id)
  where strava_athlete_id is not null;
