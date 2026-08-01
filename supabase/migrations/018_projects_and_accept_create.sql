-- Migration: 018_projects_and_accept_create.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- STEP 1: projects table + RLS
-- STEP 2: extend confirm_quote_by_confirmation_token to create a project
--         atomically with quote accept + quote_accepted notification.

-- =============================================================================
-- STEP 1 — projects table
-- =============================================================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  quote_id uuid unique references public.quotes(id) on delete set null,
  project_name text not null default '',
  value numeric not null default 0,
  status text not null default 'active'
    check (status in ('active', 'completed', 'on_hold')),
  start_date date not null default (timezone('utc', now()))::date,
  end_date date,
  materials jsonb,
  labour_items jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx
  on public.projects (user_id);

create index if not exists projects_customer_id_start_date_idx
  on public.projects (customer_id, start_date desc);

create index if not exists projects_user_id_status_idx
  on public.projects (user_id, status);

comment on table public.projects is
  'Jobs created from accepted quotes (and future manual projects).';
comment on column public.projects.quote_id is
  'Original accepted quote; unique so re-accept cannot create duplicates.';
comment on column public.projects.materials is
  'Snapshot of quote materials at acceptance time.';
comment on column public.projects.labour_items is
  'Snapshot of quote labour_items at acceptance time.';

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- STEP 2 — accept quote RPC also creates a project (same transaction)
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

  if v_quote.status = 'accepted' then
    return jsonb_build_object(
      'success', true,
      'already_accepted', true,
      'confirmed_at', v_quote.confirmed_at
    );
  end if;

  if v_quote.status <> 'sent' then
    return jsonb_build_object('error', 'invalid_status');
  end if;

  v_project_name := coalesce(nullif(trim(v_quote.project_name), ''), 'Untitled project');

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

  -- Create project from accepted quote. Any failure rolls back the whole accept.
  insert into public.projects (
    user_id,
    customer_id,
    quote_id,
    project_name,
    value,
    status,
    start_date,
    materials,
    labour_items
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
    coalesce(v_quote.labour_items, '[]'::jsonb)
  )
  returning id into v_project_id;

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

-- Optional after apply:
-- NOTIFY pgrst, 'reload schema';
