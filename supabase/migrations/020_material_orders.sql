-- Migration: 020_material_orders.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Supplier materials order confirmation flow (mirrors quote confirmation):
--   1) material_orders table with confirmation_token
--   2) Public RPCs: get + confirm by token (atomic status + notification)
--   3) notifications.type allows 'materials_confirmed'

-- =============================================================================
-- 1) material_orders
-- =============================================================================

create table if not exists public.material_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  project_name text not null default '',
  customer_name text,
  supplier_name text,
  supplier_email text,
  materials jsonb not null default '[]'::jsonb,
  notes text,
  required_by_date date,
  delivery_option text,
  project_reference text,
  status text not null default 'sent'
    check (status in ('sent', 'confirmed')),
  confirmation_token uuid not null unique default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  confirmed_at timestamptz,
  availability_date date,
  availability_time text,
  branch_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists material_orders_user_id_idx
  on public.material_orders (user_id);

create index if not exists material_orders_project_id_idx
  on public.material_orders (project_id, created_at desc);

create index if not exists material_orders_confirmation_token_idx
  on public.material_orders (confirmation_token);

comment on table public.material_orders is
  'Materials orders sent to suppliers; confirmed via public token link.';
comment on column public.material_orders.confirmation_token is
  'Public token embedded in supplier order emails for availability confirmation.';
comment on column public.material_orders.materials is
  'Snapshot of ordered materials [{ name, partNumber, brand, supplier, quantity, unit, unitPrice, status }].';

alter table public.material_orders enable row level security;

create policy "Users can view own material orders"
  on public.material_orders for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own material orders"
  on public.material_orders for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own material orders"
  on public.material_orders for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- 2) Allow materials_confirmed notification type
-- =============================================================================

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'draft_quote',
      'quote_accepted',
      'quote_declined',
      'supplier_price',
      'materials_confirmed',
      'employee_clock'
    )
  );

create or replace function public.create_notification(
  p_type text,
  p_message text,
  p_quote_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_type is null or btrim(p_type) = '' then
    raise exception 'Notification type is required';
  end if;

  if p_type not in (
    'draft_quote',
    'quote_accepted',
    'quote_declined',
    'supplier_price',
    'materials_confirmed',
    'employee_clock'
  ) then
    raise exception 'Invalid notification type: %', p_type;
  end if;

  if p_message is null or btrim(p_message) = '' then
    raise exception 'Notification message is required';
  end if;

  if p_quote_id is not null then
    if not exists (
      select 1
      from public.quotes q
      where q.id = p_quote_id
        and q.user_id = v_user_id
    ) then
      raise exception 'Quote not found or access denied';
    end if;
  end if;

  insert into public.notifications (user_id, type, quote_id, message, metadata)
  values (
    v_user_id,
    p_type,
    p_quote_id,
    btrim(p_message),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_notification(text, text, uuid, jsonb) from public;
grant execute on function public.create_notification(text, text, uuid, jsonb) to authenticated;

-- =============================================================================
-- 3) Public get by token
-- =============================================================================

create or replace function public.get_public_material_order_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_order public.material_orders%rowtype;
  v_company text;
begin
  if p_token is null then
    return null;
  end if;

  select * into v_order
  from public.material_orders
  where confirmation_token = p_token;

  if not found then
    return null;
  end if;

  select coalesce(nullif(trim(company_name), ''), 'Your Contractor')
  into v_company
  from public.business_profiles
  where user_id = v_order.user_id;

  return jsonb_build_object(
    'id', v_order.id,
    'project_id', v_order.project_id,
    'customer_id', v_order.customer_id,
    'project_name', v_order.project_name,
    'customer_name', v_order.customer_name,
    'supplier_name', v_order.supplier_name,
    'supplier_email', v_order.supplier_email,
    'materials', v_order.materials,
    'notes', v_order.notes,
    'required_by_date', v_order.required_by_date,
    'delivery_option', v_order.delivery_option,
    'project_reference', v_order.project_reference,
    'status', v_order.status,
    'confirmed_at', v_order.confirmed_at,
    'availability_date', v_order.availability_date,
    'availability_time', v_order.availability_time,
    'branch_location', v_order.branch_location,
    'company_name', coalesce(v_company, 'Your Contractor')
  );
end;
$$;

revoke all on function public.get_public_material_order_by_token(uuid) from public;
grant execute on function public.get_public_material_order_by_token(uuid) to anon, authenticated;

-- =============================================================================
-- 4) Public confirm by token (atomic: confirm + notification)
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
      'project_name', v_order.project_name
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
    'contractor_email', v_contractor_email
  );
end;
$$;

revoke all on function public.confirm_material_order_by_token(uuid, date, text, text) from public;
grant execute on function public.confirm_material_order_by_token(uuid, date, text, text) to anon, authenticated;

-- Optional after apply:
-- NOTIFY pgrst, 'reload schema';
