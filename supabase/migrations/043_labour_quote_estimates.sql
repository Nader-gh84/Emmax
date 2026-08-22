-- Migration: 043_labour_quote_estimates.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Slice 1 — Create Quote labour foundation:
--   1) time_entries.entry_source: quote_estimate | actual (default actual)
--   2) time_entries.quote_id + pay_rate_snapshot (estimate provenance / frozen cost)
--   3) One quote_estimate row per (project, employee) for clean replace + later variance
--   4) quotes / projects labour_billing_mode (time_and_material | flat)
--   5) business_profiles.labour_margin_warn_percent (default 0 = warn at ≤0%)
--   6) Labour invoice RPCs ignore quote_estimate (payroll = actual only)
--
-- Future (estimate vs actual at close): compare hours/cost by employee where
-- entry_source differs; overage billing can reference quote_id + pay_rate_snapshot
-- without rewriting this shape.

-- =============================================================================
-- 1) time_entries — estimate vs actual
-- =============================================================================

alter table public.time_entries
  add column if not exists entry_source text not null default 'actual';

alter table public.time_entries
  drop constraint if exists time_entries_entry_source_check;

alter table public.time_entries
  add constraint time_entries_entry_source_check
  check (entry_source in ('quote_estimate', 'actual'));

comment on column public.time_entries.entry_source is
  'quote_estimate = planned hours from Create Quote (cost basis / margin only). '
  'actual = hours logged on the job (payroll / labour invoices only).';

-- Provenance: which quote produced this estimate (null for actual / legacy).
alter table public.time_entries
  add column if not exists quote_id uuid references public.quotes(id) on delete set null;

comment on column public.time_entries.quote_id is
  'Quote that created a quote_estimate row. Null for actual entries. '
  'Supports replace-on-re-quote and later estimate-vs-actual closeout.';

create index if not exists time_entries_quote_id_idx
  on public.time_entries (quote_id)
  where quote_id is not null;

-- Freeze employee pay_rate at estimate (or log) time so later rate changes
-- do not rewrite historical cost / margin / variance math.
alter table public.time_entries
  add column if not exists pay_rate_snapshot numeric;

comment on column public.time_entries.pay_rate_snapshot is
  'Employee pay_rate captured when the row was written. Required for quote_estimate '
  'cost; optional for actual (labour_invoice_time_entries.rate_snapshot remains source of truth for payroll lines).';

-- Estimates are never payable.
alter table public.time_entries
  drop constraint if exists time_entries_estimate_not_paid_check;

alter table public.time_entries
  add constraint time_entries_estimate_not_paid_check
  check (
    entry_source <> 'quote_estimate'
    or coalesce(payment_status, 'unpaid') = 'unpaid'
  );

-- Latest estimate only: one planned row per employee on a project.
-- Re-running Create Quote deletes/replaces these; actuals are untouched.
create unique index if not exists time_entries_project_employee_estimate_uidx
  on public.time_entries (project_id, employee_id)
  where entry_source = 'quote_estimate';

create index if not exists time_entries_project_source_idx
  on public.time_entries (project_id, entry_source);

create index if not exists time_entries_employee_source_idx
  on public.time_entries (employee_id, entry_source);

-- =============================================================================
-- 2) quotes / projects — labour billing mode (customer presentation)
-- =============================================================================

alter table public.quotes
  add column if not exists labour_billing_mode text;

alter table public.quotes
  drop constraint if exists quotes_labour_billing_mode_check;

alter table public.quotes
  add constraint quotes_labour_billing_mode_check
  check (
    labour_billing_mode is null
    or labour_billing_mode in ('time_and_material', 'flat')
  );

comment on column public.quotes.labour_billing_mode is
  'How labour is presented on the customer quote: '
  'time_and_material = hours × customer rate; flat = single agreed amount. '
  'Internal cost always tracks per-employee hours separately.';

alter table public.projects
  add column if not exists labour_billing_mode text;

alter table public.projects
  drop constraint if exists projects_labour_billing_mode_check;

alter table public.projects
  add constraint projects_labour_billing_mode_check
  check (
    labour_billing_mode is null
    or labour_billing_mode in ('time_and_material', 'flat')
  );

comment on column public.projects.labour_billing_mode is
  'Snapshot of quotes.labour_billing_mode for this project.';

-- =============================================================================
-- 3) business_profiles — labour margin warning threshold
-- =============================================================================

alter table public.business_profiles
  add column if not exists labour_margin_warn_percent numeric not null default 0;

alter table public.business_profiles
  drop constraint if exists business_profiles_labour_margin_warn_percent_check;

alter table public.business_profiles
  add constraint business_profiles_labour_margin_warn_percent_check
  check (labour_margin_warn_percent >= 0 and labour_margin_warn_percent <= 100);

comment on column public.business_profiles.labour_margin_warn_percent is
  'Warn at Create Quote when labour margin % is at or below this value. '
  'Default 0 = warn only when margin is zero or negative. Not a hard block.';

-- =============================================================================
-- 4) ensure_labour_invoice_for_time_entry — actual rows only
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

  -- Payroll never consumes quote estimates.
  if coalesce(v_entry.entry_source, 'actual') <> 'actual' then
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
  where lite.labour_invoice_id = v_invoice_id
    and coalesce(te.entry_source, 'actual') = 'actual';

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

comment on function public.ensure_labour_invoice_for_time_entry(uuid) is
  'Attaches an actual hourly time_entry to a pay-period labour invoice. '
  'Ignores quote_estimate rows — payroll never pays against estimates.';

-- =============================================================================
-- 5) backfill_labour_invoices_for_employee — actual rows only
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
      and coalesce(te.entry_source, 'actual') = 'actual'
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

  select count(*)::integer into v_skipped_already
  from public.time_entries te
  where te.employee_id = p_employee_id
    and coalesce(te.entry_source, 'actual') = 'actual'
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
  'Attaches unlinked actual hourly time_entries for an employee to pay-period '
  'labour invoices. Skips quote_estimate. Safe to re-run.';
