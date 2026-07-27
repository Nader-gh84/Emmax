create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Users can view own customers"
  on public.customers for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own customers"
  on public.customers for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own customers"
  on public.customers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own customers"
  on public.customers for delete
  to authenticated
  using (auth.uid() = user_id);
