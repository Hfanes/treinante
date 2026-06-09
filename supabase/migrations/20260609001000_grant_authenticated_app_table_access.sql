grant usage on schema public to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.runs to authenticated;
grant select, insert, update, delete on table public.personal_records to authenticated;
grant select, insert, update, delete on table public.segments to authenticated;
grant select, insert, update, delete on table public.segment_efforts to authenticated;
grant select, insert, update, delete on table public.weekly_reports to authenticated;

update storage.buckets
set allowed_mime_types = array[
  'application/gpx+xml',
  'application/xml',
  'text/xml',
  'application/octet-stream'
]
where id = 'gpx';
