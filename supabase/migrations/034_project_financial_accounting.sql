-- Migration: 034_project_financial_accounting.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Full project accounting support for Project Detail → Financial Summary:
--   - project_expenses: billing_status, payment_status, expense_kind
--   - material_orders: payment_status (supplier costs paid vs unpaid)
--   - time_entries: payment_status (labour paid vs unpaid)
--   - change_orders: approved amounts are the only revenue adder beyond contract
--
-- Notes:
--   - Reuses employees.pay_rate for labour cost (no new hourly_rate column).
--   - project_payments.supplier_payment rows remain as legacy/optional.
--   - billing_status = add_to_change_order flags a cost for recovery; it does
--     NOT auto-increase Revised Contract Value (change_orders table only).

-- =============================================================================
-- 1) project_expenses — billing / payment / kind
-- =============================================================================

alter table public.project_expenses
  add column if not exists billing_status text not null default 'pending_review',
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists expense_kind text not null default 'extra_purchase';

-- Drop and recreate checks so re-runs stay idempotent.
alter table public.project_expenses
  drop constraint if exists project_expenses_billing_status_check;
alter table public.project_expenses
  add constraint project_expenses_billing_status_check
  check (
    billing_status in (
      'add_to_change_order',
      'included_in_customer_billing',
      'company_cost',
      'pending_review'
    )
  );

alter table public.project_expenses
  drop constraint if exists project_expenses_payment_status_check;
alter table public.project_expenses
  add constraint project_expenses_payment_status_check
  check (payment_status in ('paid', 'unpaid'));

alter table public.project_expenses
  drop constraint if exists project_expenses_expense_kind_check;
alter table public.project_expenses
  add constraint project_expenses_expense_kind_check
  check (expense_kind in ('extra_purchase', 'other_expense'));

comment on column public.project_expenses.billing_status is
  'How this expense relates to customer billing. pending_review excluded from financial totals until resolved. add_to_change_order flags cost for recovery (does not auto-add revenue).';
comment on column public.project_expenses.payment_status is
  'Whether cash has been paid out for this expense (paid vs unpaid).';
comment on column public.project_expenses.expense_kind is
  'extra_purchase = job materials/supplies; other_expense = permits, parking, fuel, delivery, rentals, inspections, subcontractors.';

create index if not exists project_expenses_project_billing_idx
  on public.project_expenses (project_id, billing_status);

create index if not exists project_expenses_project_kind_idx
  on public.project_expenses (project_id, expense_kind);

-- =============================================================================
-- 2) material_orders — payment_status
-- =============================================================================

alter table public.material_orders
  add column if not exists payment_status text not null default 'unpaid';

alter table public.material_orders
  drop constraint if exists material_orders_payment_status_check;
alter table public.material_orders
  add constraint material_orders_payment_status_check
  check (payment_status in ('paid', 'unpaid'));

comment on column public.material_orders.payment_status is
  'Whether supplier order costs have been paid. Used for Total Money Paid Out / Accounts Payable. Legacy project_payments.supplier_payment rows remain optional.';

create index if not exists material_orders_project_payment_idx
  on public.material_orders (project_id, payment_status);

-- =============================================================================
-- 3) time_entries — payment_status
-- =============================================================================

alter table public.time_entries
  add column if not exists payment_status text not null default 'unpaid';

alter table public.time_entries
  drop constraint if exists time_entries_payment_status_check;
alter table public.time_entries
  add constraint time_entries_payment_status_check
  check (payment_status in ('paid', 'unpaid'));

comment on column public.time_entries.payment_status is
  'Whether labour for this time entry has been paid out to the employee.';

create index if not exists time_entries_project_payment_idx
  on public.time_entries (project_id, payment_status);

-- =============================================================================
-- 4) change_orders
-- =============================================================================

create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  description text not null default '',
  amount numeric not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists change_orders_project_id_idx
  on public.change_orders (project_id);

create index if not exists change_orders_project_status_idx
  on public.change_orders (project_id, status);

comment on table public.change_orders is
  'Customer change orders. Only status=approved amounts increase Revised Contract Value.';
comment on column public.change_orders.amount is
  'Change order amount in CAD (decimal). Approved amounts are the only revenue adder beyond the accepted quote.';
comment on column public.change_orders.status is
  'pending = awaiting approval; approved = included in Revised Contract Value; rejected = excluded.';

alter table public.change_orders enable row level security;

drop policy if exists "Users can view own change_orders" on public.change_orders;
create policy "Users can view own change_orders"
  on public.change_orders for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own change_orders" on public.change_orders;
create policy "Users can insert own change_orders"
  on public.change_orders for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own change_orders" on public.change_orders;
create policy "Users can update own change_orders"
  on public.change_orders for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own change_orders" on public.change_orders;
create policy "Users can delete own change_orders"
  on public.change_orders for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 5) Reload PostgREST schema cache
-- =============================================================================

notify pgrst, 'reload schema';
