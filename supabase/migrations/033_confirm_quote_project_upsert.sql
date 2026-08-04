-- Migration: 033_confirm_quote_project_upsert.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Fix: customer accept fails with
--   duplicate key value violates unique constraint "projects_quote_id_key" (23505)
-- when a projects row was already created for the quote (Pre-Invoices /
-- ensureProjectForQuote) before the customer accepted.
--
-- Migration 023 already intended ON CONFLICT upsert; this migration re-applies
-- a safer UPDATE-or-INSERT path so accept is idempotent even if 023 was never
-- run, and so double-clicks / re-accepts do not create a second project.
--
-- Do NOT delete the existing project row for that quote_id — it is expected.
-- Accept should update it.

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
      v_confirmed_at
    )
    on conflict (quote_id) do update
    set
      customer_id = excluded.customer_id,
      project_name = excluded.project_name,
      value = excluded.value,
      materials = excluded.materials,
      labour_items = excluded.labour_items,
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

notify pgrst, 'reload schema';
