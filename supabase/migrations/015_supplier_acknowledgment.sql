-- Migration: 015_supplier_acknowledgment.sql
-- Run this in the Supabase SQL editor (do not auto-apply from the app).
--
-- Adds a public supplier acknowledgment token on quotes, plus a SECURITY DEFINER
-- RPC that atomically inserts a supplier_price notification and marks the token used.
-- Duplicate clicks return already_acknowledged without inserting another notification.

-- 1) Columns on quotes for the latest outbound supplier pricing request
alter table public.quotes
  add column if not exists supplier_ack_token uuid unique,
  add column if not exists supplier_acknowledged_at timestamptz,
  add column if not exists supplier_ack_supplier_name text,
  add column if not exists supplier_ack_supplier_email text;

create index if not exists quotes_supplier_ack_token_idx
  on public.quotes (supplier_ack_token)
  where supplier_ack_token is not null;

comment on column public.quotes.supplier_ack_token is
  'Public token embedded in Send-to-Supplier emails for acknowledgment links.';
comment on column public.quotes.supplier_acknowledged_at is
  'When the supplier acknowledged receipt via the public link; null means pending.';
comment on column public.quotes.supplier_ack_supplier_name is
  'Supplier display name captured at send time for the acknowledgment notification.';
comment on column public.quotes.supplier_ack_supplier_email is
  'Supplier email captured at send time for acknowledgment metadata.';

-- 2) Public lookup (read-only) so the ack page can show pending vs already used
create or replace function public.get_supplier_ack_by_token(p_token uuid)
returns table (
  quote_id uuid,
  project_name text,
  company_name text,
  supplier_name text,
  supplier_email text,
  acknowledged_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    q.id as quote_id,
    q.project_name,
    coalesce(nullif(trim(bp.company_name), ''), 'Your Contractor') as company_name,
    coalesce(nullif(trim(q.supplier_ack_supplier_name), ''), 'Supplier') as supplier_name,
    coalesce(nullif(trim(q.supplier_ack_supplier_email), ''), '') as supplier_email,
    q.supplier_acknowledged_at as acknowledged_at
  from public.quotes q
  left join public.business_profiles bp on bp.user_id = q.user_id
  where q.supplier_ack_token = p_token
  limit 1;
$$;

revoke all on function public.get_supplier_ack_by_token(uuid) from public;
grant execute on function public.get_supplier_ack_by_token(uuid) to anon, authenticated;

-- 3) Atomic acknowledge: insert notification + stamp acknowledged_at in one transaction.
--    If the notification insert fails, the whole function rolls back (no silent success).
create or replace function public.acknowledge_supplier_request(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_acknowledged_at timestamptz := now();
  v_supplier_name text;
  v_supplier_email text;
  v_message text;
begin
  if p_token is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  select * into v_quote
  from public.quotes
  where supplier_ack_token = p_token
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_quote.supplier_acknowledged_at is not null then
    return jsonb_build_object(
      'success', true,
      'already_acknowledged', true,
      'acknowledged_at', v_quote.supplier_acknowledged_at,
      'quote_id', v_quote.id,
      'supplier_name', coalesce(nullif(trim(v_quote.supplier_ack_supplier_name), ''), 'Supplier')
    );
  end if;

  v_supplier_name := coalesce(nullif(trim(v_quote.supplier_ack_supplier_name), ''), 'Supplier');
  v_supplier_email := coalesce(nullif(trim(v_quote.supplier_ack_supplier_email), ''), '');
  v_message := v_supplier_name || ' received your materials list and is preparing pricing';

  -- Notification first; any failure aborts before marking the token used.
  insert into public.notifications (user_id, type, quote_id, message, metadata)
  values (
    v_quote.user_id,
    'supplier_price',
    v_quote.id,
    v_message,
    jsonb_build_object(
      'supplier_name', v_supplier_name,
      'supplier_email', v_supplier_email
    )
  );

  update public.quotes
  set
    supplier_acknowledged_at = v_acknowledged_at,
    updated_at = v_acknowledged_at
  where id = v_quote.id;

  return jsonb_build_object(
    'success', true,
    'already_acknowledged', false,
    'acknowledged_at', v_acknowledged_at,
    'quote_id', v_quote.id,
    'user_id', v_quote.user_id,
    'supplier_name', v_supplier_name,
    'supplier_email', v_supplier_email
  );
end;
$$;

revoke all on function public.acknowledge_supplier_request(uuid) from public;
grant execute on function public.acknowledge_supplier_request(uuid) to anon, authenticated;
