-- Migration: 037_labour_accounting.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Employee Payroll / Labour Accounting (phase 1 — schema + auto-invoice on
-- time entry create):
--   1) employees: pay_period_type (weekly | biweekly | monthly)
--   2) labour_invoices (+ per-user yearly LI-YYYY-#### sequence)
--   3) labour_invoice_time_entries (junction + rate/hours snapshots)
--   4) labour_payments + labour_payment_allocations
--   5) ensure_labour_invoice_for_time_entry() helper
--
-- Notes:
--   - Invoices are pay-period batches (not per time entry / not per project).
--   - Unconfirmed invoices are excluded from outstanding (app calc).
--   - Salary employees are skipped by the auto-invoice helper (hourly only).
--   - time_entries.payment_status sync from allocations is a later app chunk.

-- =============================================================================
-- 1) employees — pay period
-- =============================================================================

alter table public.employees
  add column if not exists pay_period_type text not null default 'biweekly';

alter table public.employees
  drop constraint if exists employees_pay_period_type_check;
alter table public.employees
  add constraint employees_pay_period_type_check
  check (pay_period_type in ('weekly', 'biweekly', 'monthly'));

comment on column public.employees.pay_period_type is
  'weekly | biweekly | monthly — pay-period window for labour invoice batching.';

-- =============================================================================
-- 2) Invoice number sequences (LI-YYYY-#### per user per year)
-- =============================================================================

create table if not exists public.labour_invoice_sequences (
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  last_number integer not null default 0,
  primary key (user_id, year),
  check (year >= 2000 and year <= 2100),
  check (last_number >= 0)
);

alter table public.labour_invoice_sequences enable row level security;

drop policy if exists "Users can view own labour_invoice_sequences"
  on public.labour_invoice_sequences;
create policy "Users can view own labour_invoice_sequences"
  on public.labour_invoice_sequences for select to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates happen via SECURITY DEFINER helpers only.

-- =============================================================================
-- 3) labour_invoices
-- =============================================================================

create table if not exists public.labour_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  invoice_number text not null,
  invoice_date date not null default (timezone('utc', now()))::date,
  due_date date not null,
  period_start date not null,
  period_end date not null,
  amount numeric not null default 0 check (amount >= 0),
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'confirmed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number),
  check (period_end >= period_start)
);

create index if not exists labour_invoices_employee_status_idx
  on public.labour_invoices (employee_id, status);
create index if not exists labour_invoices_employee_period_idx
  on public.labour_invoices (employee_id, period_start, period_end);
create index if not exists labour_invoices_employee_due_idx
  on public.labour_invoices (employee_id, due_date);
create index if not exists labour_invoices_user_id_idx
  on public.labour_invoices (user_id);
create index if not exists labour_invoices_project_id_idx
  on public.labour_invoices (project_id);

comment on table public.labour_invoices is
  'AP labour invoices batched by employee pay period from time_entries.';
comment on column public.labour_invoices.status is
  'pending_confirmation = awaiting user review; confirmed counts toward outstanding.';
comment on column public.labour_invoices.project_id is
  'Set only when every linked time entry shares one project; otherwise null.';
comment on column public.labour_invoices.period_start is
  'Inclusive start of the employee pay-period window.';
comment on column public.labour_invoices.period_end is
  'Inclusive end of the employee pay-period window (also used as due_date).';

alter table public.labour_invoices enable row level security;

drop policy if exists "Users can view own labour_invoices" on public.labour_invoices;
create policy "Users can view own labour_invoices"
  on public.labour_invoices for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own labour_invoices" on public.labour_invoices;
create policy "Users can insert own labour_invoices"
  on public.labour_invoices for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own labour_invoices" on public.labour_invoices;
create policy "Users can update own labour_invoices"
  on public.labour_invoices for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own labour_invoices" on public.labour_invoices;
create policy "Users can delete own labour_invoices"
  on public.labour_invoices for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 4) labour_invoice_time_entries (junction + snapshots)
-- =============================================================================

create table if not exists public.labour_invoice_time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  labour_invoice_id uuid not null
    references public.labour_invoices(id) on delete cascade,
  time_entry_id uuid not null
    references public.time_entries(id) on delete restrict,
  hours numeric not null check (hours > 0),
  rate_snapshot numeric not null check (rate_snapshot >= 0),
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (time_entry_id),
  unique (labour_invoice_id, time_entry_id)
);

create index if not exists labour_invoice_time_entries_invoice_idx
  on public.labour_invoice_time_entries (labour_invoice_id);
create index if not exists labour_invoice_time_entries_user_id_idx
  on public.labour_invoice_time_entries (user_id);

comment on table public.labour_invoice_time_entries is
  'Links time entries to a pay-period labour invoice; snapshots hours/rate/amount.';
comment on column public.labour_invoice_time_entries.rate_snapshot is
  'employees.pay_rate at attach time (historical cost locked).';

alter table public.labour_invoice_time_entries enable row level security;

drop policy if exists "Users can view own labour_invoice_time_entries"
  on public.labour_invoice_time_entries;
create policy "Users can view own labour_invoice_time_entries"
  on public.labour_invoice_time_entries for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own labour_invoice_time_entries"
  on public.labour_invoice_time_entries;
create policy "Users can insert own labour_invoice_time_entries"
  on public.labour_invoice_time_entries for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own labour_invoice_time_entries"
  on public.labour_invoice_time_entries;
create policy "Users can update own labour_invoice_time_entries"
  on public.labour_invoice_time_entries for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own labour_invoice_time_entries"
  on public.labour_invoice_time_entries;
create policy "Users can delete own labour_invoice_time_entries"
  on public.labour_invoice_time_entries for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 5) labour_payments
-- =============================================================================

create table if not exists public.labour_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  payment_date date not null default (timezone('utc', now()))::date,
  amount numeric not null check (amount > 0),
  payment_method text not null default '',
  reference_number text,
  notes text,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists labour_payments_employee_date_idx
  on public.labour_payments (employee_id, payment_date desc);
create index if not exists labour_payments_user_id_idx
  on public.labour_payments (user_id);

comment on table public.labour_payments is
  'Account-level employee labour payments (not project-scoped). Allocations optional.';

alter table public.labour_payments enable row level security;

drop policy if exists "Users can view own labour_payments" on public.labour_payments;
create policy "Users can view own labour_payments"
  on public.labour_payments for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own labour_payments" on public.labour_payments;
create policy "Users can insert own labour_payments"
  on public.labour_payments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own labour_payments" on public.labour_payments;
create policy "Users can update own labour_payments"
  on public.labour_payments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own labour_payments" on public.labour_payments;
create policy "Users can delete own labour_payments"
  on public.labour_payments for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 6) labour_payment_allocations
-- =============================================================================

create table if not exists public.labour_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.labour_payments(id) on delete cascade,
  labour_invoice_id uuid not null
    references public.labour_invoices(id) on delete cascade,
  amount_applied numeric not null check (amount_applied > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, labour_invoice_id)
);

create index if not exists labour_payment_allocations_invoice_idx
  on public.labour_payment_allocations (labour_invoice_id);
create index if not exists labour_payment_allocations_payment_idx
  on public.labour_payment_allocations (payment_id);

comment on table public.labour_payment_allocations is
  'Splits a labour payment across one or more labour invoices (manual or FIFO).';

alter table public.labour_payment_allocations enable row level security;

drop policy if exists "Users can view own labour_payment_allocations"
  on public.labour_payment_allocations;
create policy "Users can view own labour_payment_allocations"
  on public.labour_payment_allocations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own labour_payment_allocations"
  on public.labour_payment_allocations;
create policy "Users can insert own labour_payment_allocations"
  on public.labour_payment_allocations for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own labour_payment_allocations"
  on public.labour_payment_allocations;
create policy "Users can update own labour_payment_allocations"
  on public.labour_payment_allocations for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own labour_payment_allocations"
  on public.labour_payment_allocations;
create policy "Users can delete own labour_payment_allocations"
  on public.labour_payment_allocations for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 7) Helpers: period bounds, next invoice number, ensure invoice for time entry
-- =============================================================================

create or replace function public.labour_pay_period_bounds(
  p_entry_date date,
  p_anchor date,
  p_period_type text
)
returns table (period_start date, period_end date)
language plpgsql
immutable
as $$
declare
  v_type text := coalesce(nullif(trim(p_period_type), ''), 'biweekly');
  v_anchor date := coalesce(p_anchor, p_entry_date);
  v_len integer;
  v_index numeric;
  v_start date;
begin
  if p_entry_date is null then
    raise exception 'entry_date is required';
  end if;

  if v_type = 'monthly' then
    v_start := date_trunc('month', p_entry_date::timestamp)::date;
    return query
      select
        v_start,
        (date_trunc('month', p_entry_date::timestamp) + interval '1 month - 1 day')::date;
    return;
  end if;

  v_len := case v_type
    when 'weekly' then 7
    when 'biweekly' then 14
    else 14
  end;

  v_index := floor((p_entry_date - v_anchor)::numeric / v_len);
  v_start := v_anchor + (v_index * v_len)::integer;

  return query
    select v_start, (v_start + (v_len - 1));
end;
$$;

revoke all on function public.labour_pay_period_bounds(date, date, text) from public;
grant execute on function public.labour_pay_period_bounds(date, date, text)
  to authenticated;

create or replace function public.next_labour_invoice_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from timezone('utc', now()))::integer;
  v_next integer;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  insert into public.labour_invoice_sequences (user_id, year, last_number)
  values (p_user_id, v_year, 1)
  on conflict (user_id, year)
  do update set last_number = public.labour_invoice_sequences.last_number + 1
  returning last_number into v_next;

  return 'LI-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

revoke all on function public.next_labour_invoice_number(uuid) from public;
grant execute on function public.next_labour_invoice_number(uuid) to authenticated;

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

  -- Hourly payroll only in v1.
  if coalesce(v_employee.pay_type, 'hourly') <> 'hourly' then
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
  select id into v_invoice_id
  from public.labour_invoices
  where employee_id = v_employee.id
    and status = 'pending_confirmation'
    and period_start = v_period.period_start
    and period_end = v_period.period_end
  order by created_at asc
  limit 1
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
    coalesce(sum(amount), 0),
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

comment on function public.ensure_labour_invoice_for_time_entry(uuid) is
  'Idempotently attaches a time entry to the open pending labour invoice for its pay period (hourly only).';
