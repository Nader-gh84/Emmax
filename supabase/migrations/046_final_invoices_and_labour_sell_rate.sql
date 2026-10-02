-- Migration: 046_final_invoices_and_labour_sell_rate.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Prerequisites (run first, then confirm with
-- supabase/diagnostics/check_migrations_043_044.sql):
--   043 labour quote estimates (labour_billing_mode, entry_source)
--   044 materials unitCost / unitPrice + materials_markup_percent
--   045 drop labour_markup_percent + supplier_invoices.voided
--
-- This migration:
--   1) quotes / projects.labour_sell_hourly_rate
--      T&M customer sell $/hour typed at Create Quote (own column, not JSON).
--   2) Backfill T&M sell rate from labour_items[0].rate (skip flat — that
--      JSON rate is the agreed amount, not an hourly rate).
--   3) Copy labour_billing_mode + labour_sell_hourly_rate onto projects
--      when the customer accepts a quote.
--   4) final_invoices + final_invoice_lines + FI-YYYY-#### sequence
--
-- Safe to re-run. Does not generate invoices — app code does that after you
-- approve and apply this schema.

-- =============================================================================
-- 1) T&M sell rate (Create Quote → project close)
-- =============================================================================

alter table public.quotes
  add column if not exists labour_sell_hourly_rate numeric;

alter table public.quotes
  drop constraint if exists quotes_labour_sell_hourly_rate_nonneg;
alter table public.quotes
  add constraint quotes_labour_sell_hourly_rate_nonneg
  check (labour_sell_hourly_rate is null or labour_sell_hourly_rate >= 0);

comment on column public.quotes.labour_sell_hourly_rate is
  'Customer labour sell $/hour typed at Create Quote. Used for T&M Final Invoice '
  '(actual hours × this rate). Null for flat labour or when T&M has not been set. '
  'Never inferred by AI.';

alter table public.projects
  add column if not exists labour_sell_hourly_rate numeric;

alter table public.projects
  drop constraint if exists projects_labour_sell_hourly_rate_nonneg;
alter table public.projects
  add constraint projects_labour_sell_hourly_rate_nonneg
  check (labour_sell_hourly_rate is null or labour_sell_hourly_rate >= 0);

comment on column public.projects.labour_sell_hourly_rate is
  'Snapshot of quotes.labour_sell_hourly_rate for this project. Final Invoice T&M '
  'reads this column, not labour_items JSON.';

-- =============================================================================
-- 2) Backfill from existing T&M labour_items (first line rate only)
-- =============================================================================

update public.quotes
set labour_sell_hourly_rate = round((labour_items->0->>'rate')::numeric, 2)
where labour_billing_mode = 'time_and_material'
  and labour_sell_hourly_rate is null
  and jsonb_typeof(coalesce(labour_items, '[]'::jsonb)) = 'array'
  and jsonb_array_length(labour_items) > 0
  and coalesce(labour_items->0->>'rate', '') ~ '^[0-9]+(\.[0-9]+)?$'
  and (labour_items->0->>'rate')::numeric > 0;

update public.projects p
set
  labour_sell_hourly_rate = coalesce(p.labour_sell_hourly_rate, q.labour_sell_hourly_rate),
  labour_billing_mode = coalesce(p.labour_billing_mode, q.labour_billing_mode),
  updated_at = p.updated_at
from public.quotes q
where p.quote_id = q.id
  and (
    (p.labour_sell_hourly_rate is null and q.labour_sell_hourly_rate is not null)
    or (p.labour_billing_mode is null and q.labour_billing_mode is not null)
  );

-- =============================================================================
-- 3) Invoice number sequences (FI-YYYY-#### per user per year)
-- =============================================================================

create table if not exists public.final_invoice_sequences (
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  last_number integer not null default 0,
  primary key (user_id, year),
  check (year >= 2000 and year <= 2100),
  check (last_number >= 0)
);

alter table public.final_invoice_sequences enable row level security;

drop policy if exists "Users can view own final_invoice_sequences"
  on public.final_invoice_sequences;
create policy "Users can view own final_invoice_sequences"
  on public.final_invoice_sequences for select to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates happen via SECURITY DEFINER helpers only.

create or replace function public.next_final_invoice_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from timezone('utc', now()))::integer;
  v_next integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  insert into public.final_invoice_sequences (user_id, year, last_number)
  values (p_user_id, v_year, 1)
  on conflict (user_id, year)
  do update set last_number = public.final_invoice_sequences.last_number + 1
  returning last_number into v_next;

  return 'FI-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function public.next_final_invoice_number(uuid) from public;
grant execute on function public.next_final_invoice_number(uuid) to authenticated;

comment on function public.next_final_invoice_number(uuid) is
  'Allocates the next FI-YYYY-#### number for this user (UTC year).';

-- =============================================================================
-- 4) final_invoices — one document per project
-- =============================================================================

create table if not exists public.final_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft',
  issued_at timestamptz,
  voided_at timestamptz,
  -- Frozen billing inputs (issued invoices must not drift if hours/rates change)
  labour_billing_mode text,
  labour_sell_hourly_rate numeric,
  actual_labour_hours numeric not null default 0,
  labour_amount numeric not null default 0,
  materials_amount numeric not null default 0,
  extras_amount numeric not null default 0,
  change_orders_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  gst_rate numeric not null default 0,
  pst_rate numeric not null default 0,
  gst_amount numeric not null default 0,
  pst_amount numeric not null default 0,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  notes text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

alter table public.final_invoices
  drop constraint if exists final_invoices_status_check;
alter table public.final_invoices
  add constraint final_invoices_status_check
  check (status in ('draft', 'issued', 'voided'));

alter table public.final_invoices
  drop constraint if exists final_invoices_labour_billing_mode_check;
alter table public.final_invoices
  add constraint final_invoices_labour_billing_mode_check
  check (
    labour_billing_mode is null
    or labour_billing_mode in ('time_and_material', 'flat')
  );

alter table public.final_invoices
  drop constraint if exists final_invoices_amounts_nonneg;
alter table public.final_invoices
  add constraint final_invoices_amounts_nonneg
  check (
    actual_labour_hours >= 0
    and labour_amount >= 0
    and materials_amount >= 0
    and extras_amount >= 0
    and change_orders_amount >= 0
    and discount_amount >= 0
    and gst_rate >= 0
    and pst_rate >= 0
    and gst_amount >= 0
    and pst_amount >= 0
    and subtotal >= 0
    and total >= 0
    and (labour_sell_hourly_rate is null or labour_sell_hourly_rate >= 0)
  );

alter table public.final_invoices
  drop constraint if exists final_invoices_issued_at_check;
alter table public.final_invoices
  add constraint final_invoices_issued_at_check
  check (
    (status <> 'issued') or issued_at is not null
  );

create index if not exists final_invoices_user_id_idx
  on public.final_invoices (user_id);
create index if not exists final_invoices_customer_id_idx
  on public.final_invoices (customer_id);
create index if not exists final_invoices_status_idx
  on public.final_invoices (user_id, status);

comment on table public.final_invoices is
  'Customer Final Invoice for a project. Outstanding = quote/contract value until '
  'status=issued, then total − customer_payments. One row per project.';
comment on column public.final_invoices.status is
  'draft = generated, not billed (outstanding still quote value); '
  'issued = customer billed (outstanding = total − payments); '
  'voided = ignore for outstanding (falls back to quote value).';
comment on column public.final_invoices.labour_amount is
  'T&M: actual hours × labour_sell_hourly_rate. Flat: agreed quote labour amount. '
  'Hours never change a flat invoice.';
comment on column public.final_invoices.extras_amount is
  'Sum of project_expenses with billing_status=included_in_customer_billing, '
  'billed at purchase cost (amount), no margin. company_cost is excluded.';
comment on column public.final_invoices.materials_amount is
  'Quoted materials at quoted unitPrice × quantity.';

alter table public.final_invoices enable row level security;

drop policy if exists "Users can view own final_invoices" on public.final_invoices;
create policy "Users can view own final_invoices"
  on public.final_invoices for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own final_invoices" on public.final_invoices;
create policy "Users can insert own final_invoices"
  on public.final_invoices for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own final_invoices" on public.final_invoices;
create policy "Users can update own final_invoices"
  on public.final_invoices for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own final_invoices" on public.final_invoices;
create policy "Users can delete own final_invoices"
  on public.final_invoices for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 5) final_invoice_lines
-- =============================================================================

create table if not exists public.final_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  final_invoice_id uuid not null references public.final_invoices(id) on delete cascade,
  line_kind text not null,
  source_id uuid,
  description text not null default '',
  quantity numeric not null default 1,
  unit text not null default 'each',
  unit_amount numeric not null default 0,
  amount numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.final_invoice_lines
  drop constraint if exists final_invoice_lines_kind_check;
alter table public.final_invoice_lines
  add constraint final_invoice_lines_kind_check
  check (
    line_kind in (
      'quoted_material',
      'labour',
      'extra_purchase',
      'change_order',
      'discount'
    )
  );

alter table public.final_invoice_lines
  drop constraint if exists final_invoice_lines_qty_nonneg;
alter table public.final_invoice_lines
  add constraint final_invoice_lines_qty_nonneg
  check (quantity >= 0 and unit_amount >= 0 and amount >= 0);

create index if not exists final_invoice_lines_invoice_idx
  on public.final_invoice_lines (final_invoice_id, sort_order);

create index if not exists final_invoice_lines_source_idx
  on public.final_invoice_lines (source_id)
  where source_id is not null;

comment on table public.final_invoice_lines is
  'Frozen customer-facing lines for a Final Invoice. quoted_material uses unitPrice; '
  'labour is T&M hours×sell rate or flat agreed amount; extra_purchase is cost; '
  'change_order is approved amount; discount reduces subtotal.';
comment on column public.final_invoice_lines.source_id is
  'Optional origin: project_expenses.id, change_orders.id. Null for labour / quoted materials.';

alter table public.final_invoice_lines enable row level security;

drop policy if exists "Users can view own final_invoice_lines"
  on public.final_invoice_lines;
create policy "Users can view own final_invoice_lines"
  on public.final_invoice_lines for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own final_invoice_lines"
  on public.final_invoice_lines;
create policy "Users can insert own final_invoice_lines"
  on public.final_invoice_lines for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own final_invoice_lines"
  on public.final_invoice_lines;
create policy "Users can update own final_invoice_lines"
  on public.final_invoice_lines for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own final_invoice_lines"
  on public.final_invoice_lines;
create policy "Users can delete own final_invoice_lines"
  on public.final_invoice_lines for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 6) Accept quote copies labour_billing_mode + labour_sell_hourly_rate
-- =============================================================================

create or replace function public.confirm_quote_by_confirmation_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_confirmed_at timestamptz := now();
  v_contractor_email text;
  v_project_id uuid;
  v_project_name text;
begin
  if p_token is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  select * into v_quote
  from public.quotes
  where confirmation_token = p_token
  for update;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  -- Idempotent: already accepted → success without creating another project.
  if v_quote.status = 'accepted' then
    select id into v_project_id
    from public.projects
    where quote_id = v_quote.id
    limit 1;

    return jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'confirmed_at', v_quote.confirmed_at,
      'quote_id', v_quote.id,
      'project_id', v_project_id
    );
  end if;

  if v_quote.status <> 'sent' then
    return jsonb_build_object('error', 'invalid_status');
  end if;

  v_project_name := coalesce(
    nullif(trim(v_quote.project_name), ''),
    nullif(trim(v_quote.quote_number), ''),
    'Untitled project'
  );

  update public.quotes
  set
    status = 'accepted',
    confirmed_at = v_confirmed_at,
    updated_at = v_confirmed_at
  where id = v_quote.id;

  insert into public.notifications (user_id, type, quote_id, message)
  values (
    v_quote.user_id,
    'quote_accepted',
    v_quote.id,
    coalesce(nullif(trim(v_quote.customer_name), ''), 'Your customer')
      || ' accepted your quote for '
      || coalesce(nullif(trim(v_quote.project_name), ''), 'your project')
      || '.'
  );

  -- Prefer updating an existing pre-accept project (same quote_id).
  select id into v_project_id
  from public.projects
  where quote_id = v_quote.id
  limit 1
  for update;

  if v_project_id is not null then
    update public.projects
    set
      customer_id = v_quote.customer_id,
      project_name = v_project_name,
      value = coalesce(v_quote.grand_total, 0),
      materials = v_quote.materials,
      labour_items = coalesce(v_quote.labour_items, '[]'::jsonb),
      labour_billing_mode = v_quote.labour_billing_mode,
      labour_sell_hourly_rate = v_quote.labour_sell_hourly_rate,
      updated_at = v_confirmed_at
    where id = v_project_id;
  else
    insert into public.projects (
      user_id,
      customer_id,
      quote_id,
      project_name,
      value,
      status,
      start_date,
      materials,
      labour_items,
      labour_billing_mode,
      labour_sell_hourly_rate,
      updated_at
    )
    values (
      v_quote.user_id,
      v_quote.customer_id,
      v_quote.id,
      v_project_name,
      coalesce(v_quote.grand_total, 0),
      'active',
      (v_confirmed_at at time zone 'utc')::date,
      v_quote.materials,
      coalesce(v_quote.labour_items, '[]'::jsonb),
      v_quote.labour_billing_mode,
      v_quote.labour_sell_hourly_rate,
      v_confirmed_at
    )
    on conflict (quote_id) do update
    set
      customer_id = excluded.customer_id,
      project_name = excluded.project_name,
      value = excluded.value,
      materials = excluded.materials,
      labour_items = excluded.labour_items,
      labour_billing_mode = excluded.labour_billing_mode,
      labour_sell_hourly_rate = excluded.labour_sell_hourly_rate,
      updated_at = excluded.updated_at
    returning id into v_project_id;
  end if;

  select nullif(trim(email), '')
  into v_contractor_email
  from public.business_profiles
  where user_id = v_quote.user_id;

  return jsonb_build_object(
    'success', true,
    'confirmed_at', v_confirmed_at,
    'quote_id', v_quote.id,
    'project_id', v_project_id,
    'user_id', v_quote.user_id,
    'customer_name', v_quote.customer_name,
    'project_name', v_quote.project_name,
    'grand_total', v_quote.grand_total,
    'contractor_email', v_contractor_email
  );
end;
$$;

revoke all on function public.confirm_quote_by_confirmation_token(uuid) from public;
grant execute on function public.confirm_quote_by_confirmation_token(uuid) to anon, authenticated;

-- =============================================================================
-- 7) Reload PostgREST schema cache
-- =============================================================================

notify pgrst, 'reload schema';
