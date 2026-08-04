-- Migration: 031_project_detail_operational_tables.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Supports Project Detail State B cards:
--   tasks, project_expenses, project_payments, time_entries, project_activity
-- Also adds projects.deposit_amount (no deposit column existed before).
-- Completion % is computed in the app from tasks (not a stored column).

-- =============================================================================
-- 0) Deposit amount on projects
-- =============================================================================

alter table public.projects
  add column if not exists deposit_amount numeric not null default 0;

comment on column public.projects.deposit_amount is
  'Customer deposit required for this project (CAD). Status derived from customer payments.';

-- =============================================================================
-- 1) tasks
-- =============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'completed', 'overdue')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_assigned_employee_id_idx
  on public.tasks (assigned_employee_id);

alter table public.tasks enable row level security;

drop policy if exists "Users can view own tasks" on public.tasks;
create policy "Users can view own tasks"
  on public.tasks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
  on public.tasks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
  on public.tasks for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
  on public.tasks for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 2) project_expenses (Extra Purchases)
-- =============================================================================

create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  expense_date date not null default (timezone('utc', now()))::date,
  store_name text not null default '',
  description text not null default '',
  amount numeric not null default 0,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists project_expenses_project_id_idx
  on public.project_expenses (project_id);

alter table public.project_expenses enable row level security;

drop policy if exists "Users can view own project_expenses" on public.project_expenses;
create policy "Users can view own project_expenses"
  on public.project_expenses for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own project_expenses" on public.project_expenses;
create policy "Users can insert own project_expenses"
  on public.project_expenses for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own project_expenses" on public.project_expenses;
create policy "Users can update own project_expenses"
  on public.project_expenses for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project_expenses" on public.project_expenses;
create policy "Users can delete own project_expenses"
  on public.project_expenses for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 3) project_payments
-- =============================================================================

create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  payment_type text not null
    check (payment_type in ('customer_payment', 'supplier_payment')),
  amount numeric not null default 0,
  payment_date date not null default (timezone('utc', now()))::date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists project_payments_project_id_idx
  on public.project_payments (project_id);
create index if not exists project_payments_type_idx
  on public.project_payments (project_id, payment_type);

alter table public.project_payments enable row level security;

drop policy if exists "Users can view own project_payments" on public.project_payments;
create policy "Users can view own project_payments"
  on public.project_payments for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own project_payments" on public.project_payments;
create policy "Users can insert own project_payments"
  on public.project_payments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own project_payments" on public.project_payments;
create policy "Users can update own project_payments"
  on public.project_payments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project_payments" on public.project_payments;
create policy "Users can delete own project_payments"
  on public.project_payments for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 4) time_entries
-- =============================================================================

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  hours numeric not null default 0 check (hours >= 0),
  entry_date date not null default (timezone('utc', now()))::date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists time_entries_project_id_idx
  on public.time_entries (project_id);
create index if not exists time_entries_employee_id_idx
  on public.time_entries (employee_id);

alter table public.time_entries enable row level security;

drop policy if exists "Users can view own time_entries" on public.time_entries;
create policy "Users can view own time_entries"
  on public.time_entries for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own time_entries" on public.time_entries;
create policy "Users can insert own time_entries"
  on public.time_entries for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own time_entries" on public.time_entries;
create policy "Users can update own time_entries"
  on public.time_entries for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own time_entries" on public.time_entries;
create policy "Users can delete own time_entries"
  on public.time_entries for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 5) project_activity (Recent Activity feed)
-- =============================================================================

create table if not exists public.project_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  activity_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_activity_project_created_idx
  on public.project_activity (project_id, created_at desc);

alter table public.project_activity enable row level security;

drop policy if exists "Users can view own project_activity" on public.project_activity;
create policy "Users can view own project_activity"
  on public.project_activity for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own project_activity" on public.project_activity;
create policy "Users can insert own project_activity"
  on public.project_activity for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project_activity" on public.project_activity;
create policy "Users can delete own project_activity"
  on public.project_activity for delete to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
