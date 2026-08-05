-- Migration: 035_project_completed_at.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Adds completed_at on projects for close-project audit / reporting.
-- projects.status already allows 'completed' (see migration 021).

alter table public.projects
  add column if not exists completed_at timestamptz;

comment on column public.projects.completed_at is
  'Set when the project is closed via the completion checklist.';
