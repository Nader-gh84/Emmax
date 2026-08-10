-- Migration: 042_schedule_priority.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Today redesign (H0) — priority on agenda + project checklist rows:
--   schedule_items.priority  → High / Medium / Low badges on Today timeline
--   tasks.priority           → same badges when project tasks appear on Today
-- Defaults to 'medium' so existing rows stay valid without backfill scripts.

-- =============================================================================
-- 1) schedule_items.priority
-- =============================================================================

alter table public.schedule_items
  add column if not exists priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low'));

comment on column public.schedule_items.priority is
  'Today UI priority badge: high | medium | low. Default medium.';

create index if not exists schedule_items_user_priority_idx
  on public.schedule_items (user_id, priority)
  where status in ('todo', 'in_progress');

-- =============================================================================
-- 2) tasks.priority (project checklist parity on Today)
-- =============================================================================

alter table public.tasks
  add column if not exists priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low'));

comment on column public.tasks.priority is
  'Priority badge when surfaced on Today: high | medium | low. Default medium.';

create index if not exists tasks_user_priority_idx
  on public.tasks (user_id, priority)
  where status in ('todo', 'in_progress', 'overdue');

notify pgrst, 'reload schema';
