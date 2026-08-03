-- Migration: 021_project_start_flow.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Existing (do NOT recreate):
--   projects.start_date date NOT NULL  — already present from migration 018
--   projects.status check: active | completed | on_hold
--
-- This migration adds:
--   1) projects.start_date_confirmed — true once the user picks a start date in UI
--   2) projects.status allows 'in_progress'
--   3) material_orders.materials_received_at — when contractor marks materials received

-- =============================================================================
-- 1) Explicit start-date confirmation (start_date column already exists)
-- =============================================================================

alter table public.projects
  add column if not exists start_date_confirmed boolean not null default false;

comment on column public.projects.start_date is
  'Scheduled project start date (set on quote accept by default; user may update via Project Detail).';
comment on column public.projects.start_date_confirmed is
  'True after the contractor explicitly sets/confirms start_date in the Project Detail UI.';

-- =============================================================================
-- 2) Allow in_progress project status
-- =============================================================================

alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
  check (status in ('active', 'in_progress', 'completed', 'on_hold'));

-- =============================================================================
-- 3) Materials received stamp on material_orders
-- =============================================================================

alter table public.material_orders
  add column if not exists materials_received_at timestamptz;

comment on column public.material_orders.materials_received_at is
  'When the contractor marked materials as physically received/picked up.';
