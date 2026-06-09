insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gpx', 'gpx', false, 10485760, array['application/gpx+xml', 'application/xml', 'text/xml'])
on conflict (id) do nothing;

create policy "own gpx objects read" on storage.objects
  for select
  using (
    bucket_id = 'gpx'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "own gpx objects write" on storage.objects
  for insert
  with check (
    bucket_id = 'gpx'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "own gpx objects update" on storage.objects
  for update
  using (
    bucket_id = 'gpx'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'gpx'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "own gpx objects delete" on storage.objects
  for delete
  using (
    bucket_id = 'gpx'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
