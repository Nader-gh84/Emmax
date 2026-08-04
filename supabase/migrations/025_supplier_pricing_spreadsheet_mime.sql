-- Migration: 025_supplier_pricing_spreadsheet_mime.sql
-- Extends the existing private `supplier-pricing` bucket (created in 017)
-- to accept Excel spreadsheets in addition to PDF / images / CSV.
-- Policies from 017 are unchanged (path must start with auth.uid()).

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
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ensure quote columns exist (idempotent if 017 already applied).
alter table public.quotes
  add column if not exists supplier_pricing_file_path text,
  add column if not exists supplier_pricing_uploaded_at timestamptz;
