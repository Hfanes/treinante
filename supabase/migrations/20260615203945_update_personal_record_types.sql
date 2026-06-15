alter table public.personal_records
  drop constraint if exists personal_records_type_check;

delete from public.personal_records old_records
where old_records.type = '21k'
  and exists (
    select 1
    from public.personal_records new_records
    where new_records.user_id = old_records.user_id
      and new_records.type = 'half_marathon'
  );

update public.personal_records
set type = 'half_marathon'
where type = '21k';

delete from public.personal_records old_records
where old_records.type = '42k'
  and exists (
    select 1
    from public.personal_records new_records
    where new_records.user_id = old_records.user_id
      and new_records.type = 'marathon'
  );

update public.personal_records
set type = 'marathon'
where type = '42k';

delete from public.personal_records
where type not in (
  '400m', 'half_mile', '1k', '1_mile', '2_mile', '5k', '10k', '15k',
  '10_mile', '20k', 'half_marathon', '30k', 'marathon',
  '50k', '50_mile', '100k', '100_mile', '200k', '24h', '48h',
  'longest_run', 'longest_duration', 'most_elevation', 'best_d_plus_per_km'
);

alter table public.personal_records
  add constraint personal_records_type_check
  check (type in (
    '400m', 'half_mile', '1k', '1_mile', '2_mile', '5k', '10k', '15k',
    '10_mile', '20k', 'half_marathon', '30k', 'marathon',
    '50k', '50_mile', '100k', '100_mile', '200k', '24h', '48h',
    'longest_run', 'longest_duration', 'most_elevation', 'best_d_plus_per_km'
  ));
