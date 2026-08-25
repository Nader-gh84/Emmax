-- Migration: 044_materials_cost_price_split.sql
--
-- Split supplier cost vs customer sell price on material lines, and add
-- global markup settings for materials (and labour, for Final Invoice next).
--
-- 1) business_profiles.materials_markup_percent (default 0)
-- 2) business_profiles.labour_markup_percent (default 0) — column only for now
-- 3) JSON backfill: quotes / projects / material_orders materials[]
--    - Add unitCost = unitPrice when unitCost is missing (assume no margin)
--    - On material_orders only: rename unitPrice → unitCost (orders are cost-only)
-- 4) ensure_supplier_invoice_for_order sums qty × unitCost
--
-- Safe to re-run (IF NOT EXISTS / idempotent JSON updates).

-- ---------------------------------------------------------------------------
-- 1) Markup settings
-- ---------------------------------------------------------------------------

alter table public.business_profiles
  add column if not exists materials_markup_percent numeric not null default 0;

alter table public.business_profiles
  drop constraint if exists business_profiles_materials_markup_percent_check;

alter table public.business_profiles
  add constraint business_profiles_materials_markup_percent_check
  check (materials_markup_percent >= 0 and materials_markup_percent <= 100);

comment on column public.business_profiles.materials_markup_percent is
  'Global % added to supplier unitCost to default customer unitPrice at Upload Prices. 0 = no markup.';

alter table public.business_profiles
  add column if not exists labour_markup_percent numeric not null default 0;

alter table public.business_profiles
  drop constraint if exists business_profiles_labour_markup_percent_check;

alter table public.business_profiles
  add constraint business_profiles_labour_markup_percent_check
  check (labour_markup_percent >= 0 and labour_markup_percent <= 100);

comment on column public.business_profiles.labour_markup_percent is
  'Global % added to employee pay_rate for T&M customer labour billing on Final Invoice. 0 = bill at cost rate.';

-- ---------------------------------------------------------------------------
-- 2) Backfill quote / project materials JSON: unitCost = unitPrice when absent
-- ---------------------------------------------------------------------------

update public.quotes
set materials = (
  select coalesce(
    jsonb_agg(
      case
        when elem ? 'unitCost' then elem
        else elem || jsonb_build_object(
          'unitCost',
          coalesce((elem->>'unitPrice')::numeric, (elem->>'unit_price')::numeric, 0)
        )
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(materials) = 'array' then materials
      else '[]'::jsonb
    end
  ) as elem
)
where materials is not null
  and jsonb_typeof(materials) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(materials) as e
    where not (e ? 'unitCost')
  );

update public.projects
set materials = (
  select coalesce(
    jsonb_agg(
      case
        when elem ? 'unitCost' then elem
        else elem || jsonb_build_object(
          'unitCost',
          coalesce((elem->>'unitPrice')::numeric, (elem->>'unit_price')::numeric, 0)
        )
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(materials) = 'array' then materials
      else '[]'::jsonb
    end
  ) as elem
)
where materials is not null
  and jsonb_typeof(materials) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(materials) as e
    where not (e ? 'unitCost')
  );

-- ---------------------------------------------------------------------------
-- 3) Material orders: cost-only lines — ensure unitCost, drop sell unitPrice
-- ---------------------------------------------------------------------------
-- Historical orders often stored the conflated sell price as unitPrice.
-- Migration rule (same as quotes): unitCost := existing unitPrice / unit_price /
-- unitCost when present. Then remove unitPrice / unit_price so AP never reads sell.

update public.material_orders
set materials = (
  select coalesce(
    jsonb_agg(
      (
        elem
        - 'unitPrice'
        - 'unit_price'
        - 'unit_cost'
        - 'unitCost'
      ) || jsonb_build_object(
        'unitCost',
        coalesce(
          (elem->>'unitCost')::numeric,
          (elem->>'unit_cost')::numeric,
          (elem->>'unitPrice')::numeric,
          (elem->>'unit_price')::numeric,
          0
        )
      )
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(materials) = 'array' then materials
      else '[]'::jsonb
    end
  ) as elem
)
where materials is not null
  and jsonb_typeof(materials) = 'array';

-- ---------------------------------------------------------------------------
-- 4) Supplier invoice RPC: amount = Σ (qty × unitCost)
-- ---------------------------------------------------------------------------

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

  -- Amount = sum(qty × unitCost) from materials JSON (tax not included).
  -- Prefer unitCost; fall back to legacy unitPrice keys for any row that
  -- somehow skipped the JSON rewrite above.
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
          (v_line->>'unitCost')::numeric,
          (v_line->>'unit_cost')::numeric,
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

comment on function public.ensure_supplier_invoice_for_order(uuid) is
  'Idempotently creates a pending_confirmation supplier invoice for a confirmed material order. Amount = Σ(qty × unitCost).';
