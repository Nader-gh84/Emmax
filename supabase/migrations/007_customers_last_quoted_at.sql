alter table public.customers
  add column if not exists last_quoted_at timestamptz;

create index if not exists customers_user_id_last_quoted_at_idx
  on public.customers (user_id, last_quoted_at desc nulls last);
