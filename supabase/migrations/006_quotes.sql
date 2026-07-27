create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  project_name text,
  notes text,
  materials jsonb not null default '[]'::jsonb,
  tax_rate numeric not null default 13,
  validity_days integer not null default 30,
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  grand_total numeric not null default 0,
  status text not null default 'draft',
  transcript text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint quotes_status_check check (status in ('draft', 'sent'))
);

create index if not exists quotes_user_id_created_at_idx
  on public.quotes (user_id, created_at desc);

create index if not exists quotes_user_id_status_idx
  on public.quotes (user_id, status);

alter table public.quotes enable row level security;

create policy "Users can view own quotes"
  on public.quotes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own quotes"
  on public.quotes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own quotes"
  on public.quotes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own quotes"
  on public.quotes for delete
  to authenticated
  using (auth.uid() = user_id);
