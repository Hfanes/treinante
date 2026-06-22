create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  requests integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated, public;
grant select, insert, update, delete on table public.rate_limits to service_role;

create or replace function public.check_rate_limit(
  rate_key text,
  max_requests integer,
  window_seconds integer
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(secs => window_seconds);
  current_requests integer;
  current_window_start timestamptz;
begin
  if rate_key is null or length(rate_key) = 0 then
    raise exception 'rate_key is required';
  end if;

  if max_requests < 1 or window_seconds < 1 then
    raise exception 'invalid rate limit';
  end if;

  insert into public.rate_limits as limits (key, window_start, requests, updated_at)
  values (rate_key, now(), 1, now())
  on conflict (key) do update
    set window_start = case
          when limits.window_start <= cutoff then now()
          else limits.window_start
        end,
        requests = case
          when limits.window_start <= cutoff then 1
          else limits.requests + 1
        end,
        updated_at = now()
  returning requests, window_start
  into current_requests, current_window_start;

  return query select
    current_requests <= max_requests,
    case
      when current_requests <= max_requests then 0
      else greatest(
        1,
        ceil(extract(epoch from (current_window_start + make_interval(secs => window_seconds) - now())))::integer
      )
    end;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from anon, authenticated, public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

alter table public.profiles
  add constraint profiles_name_length_check check (name is null or length(name) <= 120) not valid,
  add constraint profiles_weekly_km_goal_positive_check check (weekly_km_goal > 0 and weekly_km_goal <= 1000) not valid,
  add constraint profiles_max_hr_range_check check (max_hr is null or max_hr between 1 and 250) not valid,
  add constraint profiles_resting_hr_range_check check (resting_hr is null or resting_hr between 1 and 250) not valid,
  add constraint profiles_ftp_pace_range_check check (ftp_pace is null or ftp_pace between 1 and 86400) not valid,
  add constraint profiles_strava_athlete_name_length_check check (strava_athlete_name is null or length(strava_athlete_name) <= 120) not valid;

alter table public.runs
  add constraint runs_title_length_check check (title is null or length(title) <= 200) not valid,
  add constraint runs_sport_type_length_check check (sport_type is null or length(sport_type) <= 50) not valid,
  add constraint runs_distance_range_check check (distance > 0 and distance <= 1000) not valid,
  add constraint runs_time_range_check check (total_time > 0 and total_time <= 604800 and moving_time > 0 and moving_time <= total_time) not valid,
  add constraint runs_avg_pace_range_check check (avg_pace > 0 and avg_pace <= 86400) not valid,
  add constraint runs_hr_range_check check (
    (avg_hr is null or avg_hr between 1 and 250)
    and (max_hr is null or max_hr between 1 and 250)
  ) not valid,
  add constraint runs_power_range_check check (
    (avg_power is null or avg_power between 1 and 5000)
    and (max_power is null or max_power between 1 and 5000)
  ) not valid,
  add constraint runs_elevation_nonnegative_check check (elevation_gain >= 0 and elevation_loss >= 0) not valid,
  add constraint runs_coordinates_range_check check (
    (start_lat is null or start_lat between -90 and 90)
    and (end_lat is null or end_lat between -90 and 90)
    and (start_lng is null or start_lng between -180 and 180)
    and (end_lng is null or end_lng between -180 and 180)
  ) not valid,
  add constraint runs_text_payload_length_check check (
    (summary_polyline is null or length(summary_polyline) <= 10000)
    and (gpx_file_url is null or length(gpx_file_url) <= 500)
  ) not valid,
  add constraint runs_raw_payload_shape_check check (
    jsonb_typeof(raw_splits) = 'array'
    and jsonb_typeof(raw_source) = 'object'
  ) not valid;

alter table public.personal_records
  add constraint personal_records_value_positive_check check (value > 0) not valid;

alter table public.personal_record_events
  add constraint personal_record_events_type_check check (type in (
    '400m', 'half_mile', '1k', '1_mile', '2_mile', '5k', '10k', '15k',
    '10_mile', '20k', 'half_marathon', '30k', 'marathon',
    '50k', '50_mile', '100k', '100_mile', '200k', '24h', '48h',
    'longest_run', 'longest_duration', 'most_elevation', 'best_d_plus_per_km'
  )) not valid,
  add constraint personal_record_events_value_positive_check check (value > 0) not valid;

alter table public.segments
  add constraint segments_name_length_check check (length(name) <= 120) not valid,
  add constraint segments_distance_positive_check check (distance is null or distance > 0) not valid,
  add constraint segments_time_positive_check check (
    (best_time is null or best_time > 0)
    and (kom_time is null or kom_time > 0)
  ) not valid,
  add constraint segments_coordinates_range_check check (
    (start_lat is null or start_lat between -90 and 90)
    and (end_lat is null or end_lat between -90 and 90)
    and (start_lng is null or start_lng between -180 and 180)
    and (end_lng is null or end_lng between -180 and 180)
  ) not valid;

alter table public.segment_efforts
  add constraint segment_efforts_elapsed_time_positive_check check (elapsed_time > 0) not valid,
  add constraint segment_efforts_avg_hr_range_check check (avg_hr is null or avg_hr between 1 and 250) not valid;

alter table public.weekly_reports
  add constraint weekly_reports_totals_nonnegative_check check (
    (total_km is null or total_km >= 0)
    and (total_d_plus is null or total_d_plus >= 0)
    and (total_time is null or total_time >= 0)
    and (num_runs is null or num_runs >= 0)
  ) not valid,
  add constraint weekly_reports_avg_ranges_check check (
    (avg_pace is null or avg_pace > 0)
    and (avg_hr is null or avg_hr between 1 and 250)
  ) not valid,
  add constraint weekly_reports_zone_breakdown_shape_check check (
    zone_breakdown is null or jsonb_typeof(zone_breakdown) = 'object'
  ) not valid,
  add constraint weekly_reports_insight_text_length_check check (insight_text is null or length(insight_text) <= 2000) not valid;
