-- Migration: 029_project_overview_fields.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Adds editable Project Overview fields and ensures UPDATE RLS exists.
-- After running, reload the PostgREST schema cache (required or API updates fail).

-- =============================================================================
-- 1) Overview columns
-- =============================================================================

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

-- =============================================================================
-- 2) Ensure UPDATE policy (idempotent — safe if already created by 018)
-- =============================================================================

drop policy if exists "Users can update own projects" on public.projects;

create policy "Users can update own projects"
  on public.projects for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- 3) Reload PostgREST schema cache so new columns are writable via the API
-- =============================================================================

notify pgrst, 'reload schema';
