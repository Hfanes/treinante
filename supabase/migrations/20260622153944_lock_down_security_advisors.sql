revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

create policy "no client rate limit access" on public.rate_limits
  for all
  using (false)
  with check (false);

create policy "no client strava token access" on public.strava_tokens
  for all
  using (false)
  with check (false);
