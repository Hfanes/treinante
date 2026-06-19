alter table public.profiles
  add column unit_preference text not null default 'metric',
  add column lthr integer,
  add column hr_zone_method text not null default 'max_hr';

alter table public.profiles
  add constraint profiles_unit_preference_check
    check (unit_preference in ('metric', 'imperial')),
  add constraint profiles_lthr_check
    check (lthr is null or lthr > 0),
  add constraint profiles_hr_zone_method_check
    check (hr_zone_method in ('max_hr', 'lthr'));
