-- Migration: 012_voice_quote_builder_columns.sql
-- ADDITIVE ONLY — does not drop or modify existing columns/data.
-- Run this in the Supabase SQL Editor after review.

-- ---------------------------------------------------------------------------
-- 1) New columns for Voice Quote Builder
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists quote_number text,
  add column if not exists gst_rate numeric not null default 5,
  add column if not exists pst_rate numeric not null default 7,
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists discount_percent numeric not null default 0,
  add column if not exists valid_until date,
  add column if not exists price_display_mode text not null default 'detailed',
  add column if not exists labour_items jsonb not null default '[]'::jsonb;

-- price_display_mode: 'detailed' | 'merged'
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotes_price_display_mode_check'
  ) then
    alter table public.quotes
      add constraint quotes_price_display_mode_check
      check (price_display_mode in ('detailed', 'merged'));
  end if;
end $$;

-- uniqueness: one quote_number per user (allows nulls for rows not yet backfilled)
create unique index if not exists quotes_user_id_quote_number_uidx
  on public.quotes (user_id, quote_number)
  where quote_number is not null;

-- ---------------------------------------------------------------------------
-- 2) Helper: generate next Q-YYYY-#### number per user + calendar year
-- ---------------------------------------------------------------------------
create or replace function public.generate_quote_number(p_user_id uuid)
returns text
language plpgsql
as $$
declare
  v_year text := to_char(timezone('utc', now()), 'YYYY');
  v_prefix text := 'Q-' || v_year || '-';
  v_next int;
begin
  select coalesce(max(
    nullif(regexp_replace(quote_number, '^Q-[0-9]{4}-', ''), '')::int
  ), 0) + 1
  into v_next
  from public.quotes
  where user_id = p_user_id
    and quote_number ~ ('^Q-' || v_year || '-[0-9]+$');

  return v_prefix || lpad(v_next::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Backfill quote_number for existing rows (oldest first per user)
-- ---------------------------------------------------------------------------
with ranked as (
  select
    id,
    user_id,
    row_number() over (
      partition by user_id, extract(year from created_at at time zone 'utc')
      order by created_at asc, id asc
    ) as seq,
    to_char(created_at at time zone 'utc', 'YYYY') as yr
  from public.quotes
  where quote_number is null
)
update public.quotes q
set quote_number = 'Q-' || r.yr || '-' || lpad(r.seq::text, 4, '0')
from ranked r
where q.id = r.id;

-- ---------------------------------------------------------------------------
-- 4) Optional: auto-set quote_number on insert when omitted
-- ---------------------------------------------------------------------------
create or replace function public.set_quote_number_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.quote_number is null or btrim(new.quote_number) = '' then
    new.quote_number := public.generate_quote_number(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_set_quote_number_on_insert on public.quotes;
create trigger quotes_set_quote_number_on_insert
  before insert on public.quotes
  for each row
  execute function public.set_quote_number_on_insert();

-- ---------------------------------------------------------------------------
-- Notes for the app:
-- - labour_items jsonb shape: [{ "description": "...", "hours": 2, "rate": 85 }]
-- - materials jsonb unchanged: [{ "item", "brand?", "quantity", "unit", "unitPrice" }]
-- - validity_days kept for backward compatibility; valid_until is optional calendar date
-- - Existing tax_rate / tax / subtotal / grand_total columns are preserved
-- ---------------------------------------------------------------------------
