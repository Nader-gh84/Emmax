-- Migration: 029_project_overview_fields.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Optional project overview fields editable from Project Detail.

alter table public.projects
  add column if not exists project_type text,
  add column if not exists project_manager text,
  add column if not exists address text;

comment on column public.projects.project_type is
  'User-editable project category (e.g. Residential Renovation).';
comment on column public.projects.project_manager is
  'Assigned project manager name; defaults to Unassigned in UI when null.';
comment on column public.projects.address is
  'Job site address for this project; falls back to customer address in UI when null.';
