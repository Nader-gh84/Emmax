alter table public.business_profiles
add column if not exists country text not null default '';

-- Backfill existing Canadian profiles where country was not captured
update public.business_profiles
set country = 'Canada'
where country = '';
