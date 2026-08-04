-- Migration: 032_expense_receipts_storage.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Extra Purchases receipt photos:
--   - Ensure project_expenses.receipt_url exists (already in 031; idempotent here)
--   - Private storage bucket: expense-receipts
--   - RLS: owners can only access objects under their own user_id folder
--
-- Object path convention: {user_id}/{project_id}/{timestamp}-{filename}
-- The app stores that storage path in project_expenses.receipt_url
-- (not a permanent public URL) and creates signed URLs for display.

-- =============================================================================
-- 1) Column (idempotent — already created in 031)
-- =============================================================================

alter table public.project_expenses
  add column if not exists receipt_url text;

comment on column public.project_expenses.receipt_url is
  'Storage path of the receipt image in the expense-receipts bucket (e.g. {userId}/{projectId}/{file}). Null when no receipt was attached.';

-- =============================================================================
-- 2) Private storage bucket
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760, -- 10 MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- 3) Storage RLS — path folder[1] must equal auth.uid()
-- =============================================================================

drop policy if exists "Users can upload own expense receipts" on storage.objects;
create policy "Users can upload own expense receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own expense receipts" on storage.objects;
create policy "Users can read own expense receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own expense receipts" on storage.objects;
create policy "Users can update own expense receipts"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own expense receipts" on storage.objects;
create policy "Users can delete own expense receipts"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
