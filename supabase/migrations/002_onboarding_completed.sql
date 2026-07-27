alter table public.business_profiles
add column if not exists onboarding_completed boolean not null default false;

-- Preserve access for profiles created before this column existed
update public.business_profiles
set onboarding_completed = true;
