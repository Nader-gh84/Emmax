-- Migration: 019_project_name_fallback.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Improves confirm_quote_by_confirmation_token project naming:
-- prefer quotes.project_name, else quotes.quote_number, else 'Untitled project'.
-- Also backfills existing projects that were stored as 'Untitled project'
-- when the linked quote has a real project_name or quote_number.

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

-- Heal rows created when quotes.project_name was empty but quote_number existed,
-- or when project_name was present on the quote and should win.
update public.projects p
set
  project_name = coalesce(
    nullif(trim(q.project_name), ''),
    nullif(trim(q.quote_number), ''),
    p.project_name
  ),
  updated_at = now()
from public.quotes q
where p.quote_id = q.id
  and (
    nullif(trim(p.project_name), '') is null
    or lower(trim(p.project_name)) = 'untitled project'
  )
  and (
    nullif(trim(q.project_name), '') is not null
    or nullif(trim(q.quote_number), '') is not null
  );
