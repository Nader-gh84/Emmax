-- Migration: 038_labour_invoice_backfill.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Hardens labour invoice auto-create + adds employee-level backfill:
--   1) Replace ensure_labour_invoice_for_time_entry (safer locking, pay_type normalize)
--   2) backfill_labour_invoices_for_employee(employee_id) — attach all unlinked
--      hourly time_entries for one employee (used on Employee Detail load)

-- =============================================================================
-- 1) ensure_labour_invoice_for_time_entry (replace)
-- =============================================================================

create or replace function public.ensure_labour_invoice_for_time_entry(
  p_time_entry_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.time_entries%rowtype;
  v_employee public.employees%rowtype;
  v_period record;
  v_anchor date;
  v_rate numeric;
  v_line_amount numeric;
  v_invoice_id uuid;
  v_invoice_number text;
  v_project_id uuid;
  v_distinct_projects integer;
  v_pay_type text;
begin
  if p_time_entry_id is null then
    return null;
  end if;

  select * into v_entry
  from public.time_entries
  where id = p_time_entry_id
  for update;

  if not found then
    return null;
  end if;

  -- Idempotent: already attached to an invoice.
  select labour_invoice_id into v_invoice_id
  from public.labour_invoice_time_entries
  where time_entry_id = v_entry.id
  limit 1;

  if v_invoice_id is not null then
    return v_invoice_id;
  end if;

  select * into v_employee
  from public.employees
  where id = v_entry.employee_id;

  if not found then
    return null;
  end if;

  -- Hourly payroll only in v1 (normalize casing / whitespace).
  v_pay_type := lower(trim(coalesce(v_employee.pay_type, 'hourly')));
  if v_pay_type <> 'hourly' then
    return null;
  end if;

  v_rate := coalesce(v_employee.pay_rate, 0);
  if v_rate <= 0 or coalesce(v_entry.hours, 0) <= 0 then
    return null;
  end if;

  v_line_amount := round(v_entry.hours * v_rate, 2);
  if v_line_amount <= 0 then
    return null;
  end if;

  v_anchor := coalesce(
    v_employee.hire_date,
    (v_employee.created_at at time zone 'utc')::date
  );

  select * into v_period
  from public.labour_pay_period_bounds(
    v_entry.entry_date,
    v_anchor,
    v_employee.pay_period_type
  );

  -- Prefer an open pending invoice for this period (oldest first).
  -- Lock via id subquery to avoid ORDER BY … FOR UPDATE quirks.
  select li.id into v_invoice_id
  from public.labour_invoices li
  where li.id = (
    select id
    from public.labour_invoices
    where employee_id = v_employee.id
      and status = 'pending_confirmation'
      and period_start = v_period.period_start
      and period_end = v_period.period_end
    order by created_at asc
    limit 1
  )
  for update;

  if v_invoice_id is null then
    v_invoice_number := public.next_labour_invoice_number(v_entry.user_id);

    insert into public.labour_invoices (
      user_id,
      employee_id,
      project_id,
      invoice_number,
      invoice_date,
      due_date,
      period_start,
      period_end,
      amount,
      status,
      confirmed_at,
      created_at,
      updated_at
    )
    values (
      v_entry.user_id,
      v_employee.id,
      v_entry.project_id,
      v_invoice_number,
      v_period.period_start,
      v_period.period_end,
      v_period.period_start,
      v_period.period_end,
      0,
      'pending_confirmation',
      null,
      now(),
      now()
    )
    returning id into v_invoice_id;
  end if;

  insert into public.labour_invoice_time_entries (
    user_id,
    labour_invoice_id,
    time_entry_id,
    hours,
    rate_snapshot,
    amount
  )
  values (
    v_entry.user_id,
    v_invoice_id,
    v_entry.id,
    v_entry.hours,
    v_rate,
    v_line_amount
  );

  -- Recompute invoice amount + project_id (null when multi-project).
  select
    coalesce(sum(lite.amount), 0),
    count(distinct te.project_id),
    min(te.project_id)
  into
    v_line_amount,
    v_distinct_projects,
    v_project_id
  from public.labour_invoice_time_entries lite
  join public.time_entries te on te.id = lite.time_entry_id
  where lite.labour_invoice_id = v_invoice_id;

  update public.labour_invoices
  set
    amount = round(v_line_amount, 2),
    project_id = case
      when v_distinct_projects = 1 then v_project_id
      else null
    end,
    updated_at = now()
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke all on function public.ensure_labour_invoice_for_time_entry(uuid) from public;
grant execute on function public.ensure_labour_invoice_for_time_entry(uuid)
  to authenticated;

-- =============================================================================
-- 2) backfill_labour_invoices_for_employee
-- =============================================================================

create or replace function public.backfill_labour_invoices_for_employee(
  p_employee_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
  v_entry_id uuid;
  v_invoice_id uuid;
  v_attached integer := 0;
  v_skipped_already integer := 0;
  v_skipped_ineligible integer := 0;
  v_considered integer := 0;
  v_pay_type text;
begin
  if p_employee_id is null then
    return jsonb_build_object('ok', false, 'error', 'employee_id_required');
  end if;

  select * into v_employee
  from public.employees
  where id = p_employee_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'employee_not_found');
  end if;

  -- Callers may only backfill their own employees.
  if auth.uid() is not null and v_employee.user_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_pay_type := lower(trim(coalesce(v_employee.pay_type, 'hourly')));
  if v_pay_type <> 'hourly' then
    return jsonb_build_object(
      'ok', true,
      'attached', 0,
      'skipped_already_linked', 0,
      'skipped_ineligible', 0,
      'considered', 0,
      'reason', 'salary_employee_skipped'
    );
  end if;

  if coalesce(v_employee.pay_rate, 0) <= 0 then
    return jsonb_build_object(
      'ok', true,
      'attached', 0,
      'skipped_already_linked', 0,
      'skipped_ineligible', 0,
      'considered', 0,
      'reason', 'missing_pay_rate'
    );
  end if;

  for v_entry_id in
    select te.id
    from public.time_entries te
    where te.employee_id = p_employee_id
      and coalesce(te.hours, 0) > 0
      and not exists (
        select 1
        from public.labour_invoice_time_entries lite
        where lite.time_entry_id = te.id
      )
    order by te.entry_date asc, te.created_at asc
  loop
    v_considered := v_considered + 1;
    v_invoice_id := public.ensure_labour_invoice_for_time_entry(v_entry_id);
    if v_invoice_id is null then
      v_skipped_ineligible := v_skipped_ineligible + 1;
    else
      v_attached := v_attached + 1;
    end if;
  end loop;

  -- Count already-linked for transparency.
  select count(*)::integer into v_skipped_already
  from public.time_entries te
  where te.employee_id = p_employee_id
    and exists (
      select 1
      from public.labour_invoice_time_entries lite
      where lite.time_entry_id = te.id
    );

  return jsonb_build_object(
    'ok', true,
    'attached', v_attached,
    'skipped_already_linked', v_skipped_already,
    'skipped_ineligible', v_skipped_ineligible,
    'considered', v_considered
  );
end;
$$;

revoke all on function public.backfill_labour_invoices_for_employee(uuid) from public;
grant execute on function public.backfill_labour_invoices_for_employee(uuid)
  to authenticated;

comment on function public.backfill_labour_invoices_for_employee(uuid) is
  'Attaches all unlinked hourly time_entries for an employee to pay-period labour invoices. Safe to re-run.';
