-- Migration: 016_quote_decline.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Extends customer quote confirmation with Decline:
--   - quotes.status allows 'declined'
--   - notifications.type allows 'quote_declined'
--   - SECURITY DEFINER RPC decline_quote_by_confirmation_token
--     atomically updates quote status + inserts notification (rollback on failure)

-- 1) Quote decline columns + status constraint
alter table public.quotes
  add column if not exists declined_at timestamptz,
  add column if not exists decline_reason text;

comment on column public.quotes.declined_at is
  'When the customer declined the quote via the public confirmation link.';
comment on column public.quotes.decline_reason is
  'Optional free-text reason provided by the customer when declining.';

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'declined'));

-- 2) Allow quote_declined notification type (013 only created the check if missing)
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
      'employee_clock'
    )
  );

-- Keep create_notification() in sync with the type allow-list
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

-- 3) Atomic decline RPC (no silent-success path)
create or replace function public.decline_quote_by_confirmation_token(
  p_token uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_declined_at timestamptz := now();
  v_customer_name text;
  v_project_name text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_message text;
begin
  if p_token is null then
    return jsonb_build_object('success', false, 'error', 'invalid_token');
  end if;

  select * into v_quote
  from public.quotes
  where confirmation_token = p_token
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_quote.status = 'declined' then
    return jsonb_build_object(
      'success', true,
      'already_declined', true,
      'declined_at', v_quote.declined_at,
      'quote_id', v_quote.id,
      'decline_reason', v_quote.decline_reason
    );
  end if;

  if v_quote.status = 'accepted' then
    return jsonb_build_object('success', false, 'error', 'already_accepted');
  end if;

  if v_quote.status <> 'sent' then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  v_customer_name := coalesce(nullif(trim(v_quote.customer_name), ''), 'Your customer');
  v_project_name := coalesce(nullif(trim(v_quote.project_name), ''), 'your project');

  if v_reason is not null then
    v_message := v_customer_name || ' declined the quote: ' || v_reason;
  else
    v_message := v_customer_name || ' declined the quote for ' || v_project_name || '.';
  end if;

  -- Notification first; any failure aborts before marking the quote declined.
  insert into public.notifications (user_id, type, quote_id, message, metadata)
  values (
    v_quote.user_id,
    'quote_declined',
    v_quote.id,
    v_message,
    jsonb_build_object(
      'customer_name', v_customer_name,
      'project_name', v_project_name,
      'decline_reason', v_reason,
      'grand_total', v_quote.grand_total
    )
  );

  update public.quotes
  set
    status = 'declined',
    declined_at = v_declined_at,
    decline_reason = v_reason,
    updated_at = v_declined_at
  where id = v_quote.id;

  return jsonb_build_object(
    'success', true,
    'already_declined', false,
    'declined_at', v_declined_at,
    'quote_id', v_quote.id,
    'user_id', v_quote.user_id,
    'customer_name', v_customer_name,
    'project_name', v_project_name,
    'decline_reason', v_reason
  );
end;
$$;

revoke all on function public.decline_quote_by_confirmation_token(uuid, text) from public;
grant execute on function public.decline_quote_by_confirmation_token(uuid, text) to anon, authenticated;

-- Optional after apply:
-- NOTIFY pgrst, 'reload schema';
