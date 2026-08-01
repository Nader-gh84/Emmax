-- Migration: 017_supplier_pricing_uploads.sql
-- Run in Supabase SQL editor if not already applied.
--
-- Storage for supplier pricing replies (PDF / images / text) linked to quotes,
-- plus columns to remember the latest uploaded file for audit.

alter table public.quotes
  add column if not exists supplier_pricing_file_path text,
  add column if not exists supplier_pricing_uploaded_at timestamptz;

comment on column public.quotes.supplier_pricing_file_path is
  'Storage path of the latest supplier pricing reply file (bucket: supplier-pricing).';
comment on column public.quotes.supplier_pricing_uploaded_at is
  'When the latest supplier pricing reply file was uploaded.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-pricing',
  'supplier-pricing',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do nothing;

create policy "Users can upload own supplier pricing files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'supplier-pricing'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own supplier pricing files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'supplier-pricing'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own supplier pricing files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'supplier-pricing'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own supplier pricing files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'supplier-pricing'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
