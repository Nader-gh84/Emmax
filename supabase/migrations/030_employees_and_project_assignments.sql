-- Migration: 030_employees_and_project_assignments.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Employees registry (Advance Setting > Employees) + project assignments
-- used to notify crew when a project is started.

-- =============================================================================
-- 1) employees table
-- =============================================================================

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role text,
  hire_date date,
  pay_rate numeric,
  pay_type text not null default 'hourly'
    check (pay_type in ('hourly', 'salary')),
  address_street text,
  address_city text,
  address_province text,
  address_postal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_user_id_name_idx
  on public.employees (user_id, full_name);

comment on table public.employees is
  'Contractor crew members managed under Advance Setting > Employees.';
comment on column public.employees.pay_type is
  'hourly = hourly wage; salary = fixed/salary pay.';

alter table public.employees enable row level security;

drop policy if exists "Users can view own employees" on public.employees;
create policy "Users can view own employees"
  on public.employees for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own employees" on public.employees;
create policy "Users can insert own employees"
  on public.employees for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own employees" on public.employees;
create policy "Users can update own employees"
  on public.employees for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own employees" on public.employees;
create policy "Users can delete own employees"
  on public.employees for delete
  to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 2) project_employees (assignment junction)
-- =============================================================================

create table if not exists public.project_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, employee_id)
);

create index if not exists project_employees_project_id_idx
  on public.project_employees (project_id);

create index if not exists project_employees_employee_id_idx
  on public.project_employees (employee_id);

comment on table public.project_employees is
  'Employees assigned to a project (notified when Start Project runs).';

alter table public.project_employees enable row level security;

drop policy if exists "Users can view own project_employees" on public.project_employees;
create policy "Users can view own project_employees"
  on public.project_employees for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own project_employees" on public.project_employees;
create policy "Users can insert own project_employees"
  on public.project_employees for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own project_employees" on public.project_employees;
create policy "Users can update own project_employees"
  on public.project_employees for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project_employees" on public.project_employees;
create policy "Users can delete own project_employees"
  on public.project_employees for delete
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
