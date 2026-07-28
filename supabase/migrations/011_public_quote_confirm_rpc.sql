-- Public quote confirmation lookups for unauthenticated customers.
-- SECURITY DEFINER functions allow anon callers to fetch/confirm by token only.

create or replace function public.get_public_quote_by_confirmation_token(p_token uuid)
returns table (
  id uuid,
  status text,
  project_name text,
  customer_name text,
  materials jsonb,
  tax_rate numeric,
  grand_total numeric,
  confirmed_at timestamptz,
  company_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    q.id,
    q.status,
    q.project_name,
    q.customer_name,
    q.materials,
    q.tax_rate,
    q.grand_total,
    q.confirmed_at,
    coalesce(nullif(trim(bp.company_name), ''), 'Your Contractor') as company_name
  from public.quotes q
  left join public.business_profiles bp on bp.user_id = q.user_id
  where q.confirmation_token = p_token
  limit 1;
$$;

revoke all on function public.get_public_quote_by_confirmation_token(uuid) from public;
grant execute on function public.get_public_quote_by_confirmation_token(uuid) to anon, authenticated;

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
begin
  select * into v_quote
  from public.quotes
  where confirmation_token = p_token
  limit 1;

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

  select nullif(trim(email), '')
  into v_contractor_email
  from public.business_profiles
  where user_id = v_quote.user_id;

  return jsonb_build_object(
    'success', true,
    'confirmed_at', v_confirmed_at,
    'quote_id', v_quote.id,
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
