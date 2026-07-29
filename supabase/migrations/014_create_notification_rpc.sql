-- Migration: 014_create_notification_rpc.sql
-- ADDITIVE ONLY — trusted server/RPC write path for inbox notifications.
-- Run in Supabase SQL Editor if not already applied.
--
-- Mirrors the quote_accepted pattern: clients cannot insert directly under RLS;
-- authenticated callers invoke this SECURITY DEFINER function instead.

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
    'supplier_price',
    'employee_clock'
  ) then
    raise exception 'Invalid notification type: %', p_type;
  end if;

  if p_message is null or btrim(p_message) = '' then
    raise exception 'Notification message is required';
  end if;

  -- Quote-linked types must reference a quote owned by the caller.
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

-- Optional schema cache refresh after applying:
-- NOTIFY pgrst, 'reload schema';
