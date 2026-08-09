-- Migration: 041_schedule_items.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Today / Daily Command Center — schedule_items:
--   First-class timed agenda rows (personal tasks, site visits, calls, etc.).
--   Existing public.tasks remains the project checklist (project_id required).
--   Google Calendar fields are nullable placeholders for a later sync adapter.
--
-- Also:
--   - Index on tasks.due_date for "due today" aggregation on the Today page.

-- =============================================================================
-- 1) schedule_items
-- =============================================================================

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  task_type text not null default 'personal'
    check (task_type in (
      'project_task',
      'pickup',
      'delivery',
      'site_visit',
      'call',
      'inspection',
      'payment_reminder',
      'personal',
      'other'
    )),

  title text not null,
  notes text,

  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'completed', 'cancelled')),

  scheduled_start timestamptz,
  scheduled_end timestamptz,
  all_day boolean not null default false,

  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  material_order_id uuid references public.material_orders(id) on delete set null,
  source_task_id uuid references public.tasks(id) on delete set null,

  source text not null default 'manual'
    check (source in (
      'manual',
      'from_project_task',
      'from_material_order',
      'from_invoice',
      'voice'
    )),

  completed_at timestamptz,

  -- Google Calendar (unused in v1 — do not populate yet)
  external_calendar_id text,
  external_event_id text,
  external_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint schedule_items_end_after_start_check
    check (
      scheduled_end is null
      or scheduled_start is null
      or scheduled_end >= scheduled_start
    )
);

create index if not exists schedule_items_user_start_idx
  on public.schedule_items (user_id, scheduled_start);
create index if not exists schedule_items_user_status_idx
  on public.schedule_items (user_id, status);
create index if not exists schedule_items_source_task_id_idx
  on public.schedule_items (source_task_id)
  where source_task_id is not null;
create index if not exists schedule_items_project_id_idx
  on public.schedule_items (project_id)
  where project_id is not null;

comment on table public.schedule_items is
  'Today / calendar agenda items (timed or all-day). Distinct from project checklist tasks.';
comment on column public.schedule_items.task_type is
  'project_task | pickup | delivery | site_visit | call | inspection | payment_reminder | personal | other';
comment on column public.schedule_items.source_task_id is
  'Optional link to public.tasks when this row mirrors a project checklist task.';
comment on column public.schedule_items.external_event_id is
  'Reserved for future Google Calendar sync; null in v1.';

alter table public.schedule_items enable row level security;

drop policy if exists "Users can view own schedule_items" on public.schedule_items;
create policy "Users can view own schedule_items"
  on public.schedule_items for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own schedule_items" on public.schedule_items;
create policy "Users can insert own schedule_items"
  on public.schedule_items for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own schedule_items" on public.schedule_items;
create policy "Users can update own schedule_items"
  on public.schedule_items for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own schedule_items" on public.schedule_items;
create policy "Users can delete own schedule_items"
  on public.schedule_items for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 2) tasks — due_date index for Today aggregation
-- =============================================================================

create index if not exists tasks_user_due_date_idx
  on public.tasks (user_id, due_date)
  where due_date is not null;

notify pgrst, 'reload schema';
