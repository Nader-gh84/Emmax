-- Business profiles for onboarding and quote defaults
create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null default '',
  company_name text not null default '',
  trade text not null default '',
  city text not null default '',
  email text not null default '',
  phone text,
  default_tax_rate numeric not null default 13,
  default_validity_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

create policy "Users can view own business profile"
  on public.business_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own business profile"
  on public.business_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own business profile"
  on public.business_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
