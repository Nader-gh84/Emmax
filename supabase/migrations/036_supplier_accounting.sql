-- Migration: 036_supplier_accounting.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Supplier Accounting (phase 1 — schema + auto-invoice on material order confirm):
--   1) suppliers: credit_limit, minimum_monthly_payment, payment_terms_type,
--      default_account_number, notes
--   2) supplier_invoices (+ per-user yearly SI-YYYY-#### sequence)
--   3) supplier_payments + supplier_payment_allocations
--   4) ensure_supplier_invoice_for_order() helper
--   5) confirm_material_order_by_token creates a pending_confirmation invoice
--
-- Notes:
--   - Unconfirmed invoices are excluded from outstanding (app calc).
--   - Returns/credits out of scope.
--   - Legacy project_payments.supplier_payment rows are kept; material_orders
--     payment_status will be synced from allocations in a later app chunk.

-- =============================================================================
-- 1) suppliers — credit / terms fields
-- =============================================================================

alter table public.suppliers
  add column if not exists credit_limit numeric,
  add column if not exists minimum_monthly_payment numeric,
  add column if not exists payment_terms_type text not null default 'net_30',
  add column if not exists default_account_number text,
  add column if not exists notes text;

alter table public.suppliers
  drop constraint if exists suppliers_payment_terms_type_check;
alter table public.suppliers
  add constraint suppliers_payment_terms_type_check
  check (
    payment_terms_type in ('net_15', 'net_30', 'monthly_minimum', 'none')
  );

alter table public.suppliers
  drop constraint if exists suppliers_credit_limit_nonneg;
alter table public.suppliers
  add constraint suppliers_credit_limit_nonneg
  check (credit_limit is null or credit_limit >= 0);

alter table public.suppliers
  drop constraint if exists suppliers_minimum_monthly_payment_nonneg;
alter table public.suppliers
  add constraint suppliers_minimum_monthly_payment_nonneg
  check (minimum_monthly_payment is null or minimum_monthly_payment >= 0);

comment on column public.suppliers.credit_limit is
  'Optional account credit limit (CAD). Null = no limit tracked.';
comment on column public.suppliers.minimum_monthly_payment is
  'Optional minimum monthly payment expectation (informational).';
comment on column public.suppliers.payment_terms_type is
  'net_15 | net_30 | monthly_minimum | none — used for invoice due dates.';
comment on column public.suppliers.default_account_number is
  'Supplier account number shown on Supplier Detail.';

-- =============================================================================
-- 2) Invoice number sequences (SI-YYYY-#### per user per year)
-- =============================================================================

create table if not exists public.supplier_invoice_sequences (
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  last_number integer not null default 0,
  primary key (user_id, year),
  check (year >= 2000 and year <= 2100),
  check (last_number >= 0)
);

alter table public.supplier_invoice_sequences enable row level security;

drop policy if exists "Users can view own supplier_invoice_sequences"
  on public.supplier_invoice_sequences;
create policy "Users can view own supplier_invoice_sequences"
  on public.supplier_invoice_sequences for select to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates happen via SECURITY DEFINER helpers only.

-- =============================================================================
-- 3) supplier_invoices
-- =============================================================================

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  material_order_id uuid unique references public.material_orders(id) on delete set null,
  invoice_number text not null,
  invoice_date date not null default (timezone('utc', now()))::date,
  due_date date not null,
  amount numeric not null default 0 check (amount >= 0),
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'confirmed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create index if not exists supplier_invoices_supplier_status_idx
  on public.supplier_invoices (supplier_id, status);
create index if not exists supplier_invoices_supplier_due_idx
  on public.supplier_invoices (supplier_id, due_date);
create index if not exists supplier_invoices_user_id_idx
  on public.supplier_invoices (user_id);
create index if not exists supplier_invoices_project_id_idx
  on public.supplier_invoices (project_id);

comment on table public.supplier_invoices is
  'AP invoices auto-created from confirmed material orders (and future manual bills).';
comment on column public.supplier_invoices.status is
  'pending_confirmation = awaiting user review; confirmed counts toward outstanding.';
comment on column public.supplier_invoices.material_order_id is
  'Source material order when auto-created; unique so re-confirm cannot duplicate.';

alter table public.supplier_invoices enable row level security;

drop policy if exists "Users can view own supplier_invoices" on public.supplier_invoices;
create policy "Users can view own supplier_invoices"
  on public.supplier_invoices for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own supplier_invoices" on public.supplier_invoices;
create policy "Users can insert own supplier_invoices"
  on public.supplier_invoices for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own supplier_invoices" on public.supplier_invoices;
create policy "Users can update own supplier_invoices"
  on public.supplier_invoices for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own supplier_invoices" on public.supplier_invoices;
create policy "Users can delete own supplier_invoices"
  on public.supplier_invoices for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 4) supplier_payments
-- =============================================================================

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  payment_date date not null default (timezone('utc', now()))::date,
  amount numeric not null check (amount > 0),
  payment_method text not null default '',
  reference_number text,
  notes text,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists supplier_payments_supplier_date_idx
  on public.supplier_payments (supplier_id, payment_date desc);
create index if not exists supplier_payments_user_id_idx
  on public.supplier_payments (user_id);

comment on table public.supplier_payments is
  'Account-level supplier payments (not project-scoped). Allocations optional.';

alter table public.supplier_payments enable row level security;

drop policy if exists "Users can view own supplier_payments" on public.supplier_payments;
create policy "Users can view own supplier_payments"
  on public.supplier_payments for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own supplier_payments" on public.supplier_payments;
create policy "Users can insert own supplier_payments"
  on public.supplier_payments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own supplier_payments" on public.supplier_payments;
create policy "Users can update own supplier_payments"
  on public.supplier_payments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own supplier_payments" on public.supplier_payments;
create policy "Users can delete own supplier_payments"
  on public.supplier_payments for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 5) supplier_payment_allocations
-- =============================================================================

create table if not exists public.supplier_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.supplier_payments(id) on delete cascade,
  invoice_id uuid not null references public.supplier_invoices(id) on delete cascade,
  amount_applied numeric not null check (amount_applied > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, invoice_id)
);

create index if not exists supplier_payment_allocations_invoice_idx
  on public.supplier_payment_allocations (invoice_id);
create index if not exists supplier_payment_allocations_payment_idx
  on public.supplier_payment_allocations (payment_id);

comment on table public.supplier_payment_allocations is
  'Splits a supplier payment across one or more invoices (manual or FIFO).';

alter table public.supplier_payment_allocations enable row level security;

drop policy if exists "Users can view own supplier_payment_allocations"
  on public.supplier_payment_allocations;
create policy "Users can view own supplier_payment_allocations"
  on public.supplier_payment_allocations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own supplier_payment_allocations"
  on public.supplier_payment_allocations;
create policy "Users can insert own supplier_payment_allocations"
  on public.supplier_payment_allocations for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own supplier_payment_allocations"
  on public.supplier_payment_allocations;
create policy "Users can update own supplier_payment_allocations"
  on public.supplier_payment_allocations for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own supplier_payment_allocations"
  on public.supplier_payment_allocations;
create policy "Users can delete own supplier_payment_allocations"
  on public.supplier_payment_allocations for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 6) Helpers: next invoice number + ensure invoice for material order
-- =============================================================================

create or replace function public.next_supplier_invoice_number(p_user_id uuid)
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

  insert into public.supplier_invoice_sequences (user_id, year, last_number)
  values (p_user_id, v_year, 1)
  on conflict (user_id, year)
  do update set last_number = public.supplier_invoice_sequences.last_number + 1
  returning last_number into v_next;

  return 'SI-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function public.next_supplier_invoice_number(uuid) from public;
grant execute on function public.next_supplier_invoice_number(uuid) to authenticated;

create or replace function public.ensure_supplier_invoice_for_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.material_orders%rowtype;
  v_terms text;
  v_amount numeric := 0;
  v_line jsonb;
  v_qty numeric;
  v_unit numeric;
  v_invoice_date date;
  v_due_date date;
  v_invoice_id uuid;
  v_invoice_number text;
begin
  if p_order_id is null then
    return null;
  end if;

  select * into v_order
  from public.material_orders
  where id = p_order_id
  for update;

  if not found then
    return null;
  end if;

  -- Only create once the order is confirmed (availability ack).
  if v_order.status <> 'confirmed' then
    return null;
  end if;

  if v_order.supplier_id is null then
    return null;
  end if;

  -- Idempotent: existing invoice for this order.
  select id into v_invoice_id
  from public.supplier_invoices
  where material_order_id = v_order.id
  limit 1;

  if v_invoice_id is not null then
    return v_invoice_id;
  end if;

  -- Amount = sum(qty × unitPrice) from materials JSON (tax not included).
  if jsonb_typeof(v_order.materials) = 'array' then
    for v_line in select * from jsonb_array_elements(v_order.materials)
    loop
      begin
        v_qty := coalesce((v_line->>'quantity')::numeric, 0);
      exception when others then
        v_qty := 0;
      end;
      begin
        v_unit := coalesce(
          (v_line->>'unitPrice')::numeric,
          (v_line->>'unit_price')::numeric,
          0
        );
      exception when others then
        v_unit := 0;
      end;
      v_amount := v_amount + (v_qty * v_unit);
    end loop;
  end if;

  v_amount := round(v_amount, 2);

  if v_amount <= 0 then
    return null;
  end if;

  select coalesce(nullif(trim(payment_terms_type), ''), 'net_30')
  into v_terms
  from public.suppliers
  where id = v_order.supplier_id;

  v_invoice_date := coalesce(
    (v_order.confirmed_at at time zone 'utc')::date,
    (timezone('utc', now()))::date
  );

  v_due_date := case v_terms
    when 'net_15' then v_invoice_date + 15
    when 'net_30' then v_invoice_date + 30
    when 'monthly_minimum' then v_invoice_date + 30
    when 'none' then v_invoice_date + 30
    else v_invoice_date + 30
  end;

  v_invoice_number := public.next_supplier_invoice_number(v_order.user_id);

  insert into public.supplier_invoices (
    user_id,
    supplier_id,
    project_id,
    material_order_id,
    invoice_number,
    invoice_date,
    due_date,
    amount,
    status,
    confirmed_at,
    created_at,
    updated_at
  )
  values (
    v_order.user_id,
    v_order.supplier_id,
    v_order.project_id,
    v_order.id,
    v_invoice_number,
    v_invoice_date,
    v_due_date,
    v_amount,
    'pending_confirmation',
    null,
    timezone('utc', now()),
    timezone('utc', now())
  )
  returning id into v_invoice_id;

  return v_invoice_id;
exception
  when unique_violation then
    -- Race: another session created the invoice; return existing.
    select id into v_invoice_id
    from public.supplier_invoices
    where material_order_id = p_order_id
    limit 1;
    return v_invoice_id;
end;
$$;

revoke all on function public.ensure_supplier_invoice_for_order(uuid) from public;
grant execute on function public.ensure_supplier_invoice_for_order(uuid) to authenticated;

comment on function public.ensure_supplier_invoice_for_order(uuid) is
  'Idempotently creates a pending_confirmation supplier invoice for a confirmed material order.';

-- =============================================================================
-- 7) confirm_material_order_by_token — also ensure supplier invoice
-- =============================================================================

create or replace function public.confirm_material_order_by_token(
  p_token uuid,
  p_availability_date date,
  p_availability_time text,
  p_branch_location text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.material_orders%rowtype;
  v_confirmed_at timestamptz := now();
  v_supplier_name text;
  v_message text;
  v_date_label text;
  v_time_label text;
  v_branch text;
  v_contractor_email text;
  v_invoice_id uuid;
begin
  if p_token is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  if p_availability_date is null then
    return jsonb_build_object('success', false, 'error', 'missing_availability_date');
  end if;

  if nullif(trim(coalesce(p_availability_time, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'missing_availability_time');
  end if;

  if nullif(trim(coalesce(p_branch_location, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'missing_branch_location');
  end if;

  select * into v_order
  from public.material_orders
  where confirmation_token = p_token
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_order.status = 'confirmed' then
    -- Backfill invoice if migration ran after an earlier confirm.
    begin
      v_invoice_id := public.ensure_supplier_invoice_for_order(v_order.id);
    exception when others then
      v_invoice_id := null;
    end;

    return jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'confirmed_at', v_order.confirmed_at,
      'availability_date', v_order.availability_date,
      'availability_time', v_order.availability_time,
      'branch_location', v_order.branch_location,
      'order_id', v_order.id,
      'project_id', v_order.project_id,
      'customer_id', v_order.customer_id,
      'user_id', v_order.user_id,
      'supplier_name', coalesce(nullif(trim(v_order.supplier_name), ''), 'Supplier'),
      'project_name', v_order.project_name,
      'supplier_invoice_id', v_invoice_id
    );
  end if;

  if v_order.status <> 'sent' then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  v_supplier_name := coalesce(nullif(trim(v_order.supplier_name), ''), 'Supplier');
  v_branch := trim(p_branch_location);
  v_time_label := trim(p_availability_time);
  v_date_label := to_char(p_availability_date, 'Mon DD, YYYY');

  v_message := v_supplier_name
    || ' confirmed materials will be ready on '
    || v_date_label
    || ' at '
    || v_time_label
    || ' at '
    || v_branch
    || '.';

  update public.material_orders
  set
    status = 'confirmed',
    confirmed_at = v_confirmed_at,
    availability_date = p_availability_date,
    availability_time = v_time_label,
    branch_location = v_branch,
    updated_at = v_confirmed_at
  where id = v_order.id;

  insert into public.notifications (user_id, type, quote_id, message, metadata)
  values (
    v_order.user_id,
    'materials_confirmed',
    null,
    v_message,
    jsonb_build_object(
      'supplier_name', v_supplier_name,
      'supplier_email', coalesce(v_order.supplier_email, ''),
      'project_name', v_order.project_name,
      'project_id', v_order.project_id,
      'customer_id', v_order.customer_id,
      'material_order_id', v_order.id,
      'availability_date', p_availability_date,
      'availability_time', v_time_label,
      'branch_location', v_branch
    )
  );

  -- Auto-create pending supplier invoice (best-effort; confirm still succeeds).
  begin
    v_invoice_id := public.ensure_supplier_invoice_for_order(v_order.id);
  exception when others then
    v_invoice_id := null;
  end;

  select nullif(trim(email), '')
  into v_contractor_email
  from public.business_profiles
  where user_id = v_order.user_id;

  return jsonb_build_object(
    'success', true,
    'already_confirmed', false,
    'confirmed_at', v_confirmed_at,
    'availability_date', p_availability_date,
    'availability_time', v_time_label,
    'branch_location', v_branch,
    'order_id', v_order.id,
    'project_id', v_order.project_id,
    'customer_id', v_order.customer_id,
    'user_id', v_order.user_id,
    'supplier_name', v_supplier_name,
    'project_name', v_order.project_name,
    'contractor_email', v_contractor_email,
    'supplier_invoice_id', v_invoice_id
  );
end;
$$;

revoke all on function public.confirm_material_order_by_token(uuid, date, text, text) from public;
grant execute on function public.confirm_material_order_by_token(uuid, date, text, text) to anon, authenticated;

-- Optional after apply:
-- NOTIFY pgrst, 'reload schema';
