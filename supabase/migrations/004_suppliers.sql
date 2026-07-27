create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  supplier_name text not null,
  contact_person text,
  email text,
  phone text,
  location text,
  preferred_order_method text,
  created_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create policy "Users can view own suppliers"
  on public.suppliers for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own suppliers"
  on public.suppliers for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own suppliers"
  on public.suppliers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own suppliers"
  on public.suppliers for delete
  to authenticated
  using (auth.uid() = user_id);
