-- Migration: 026_quote_pdfs_storage_idempotent.sql
-- Recreate the private quote-pdfs bucket + RLS policies if missing.
-- Safe to re-run. Required for Create Quote (step 4) PDF upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-pdfs',
  'quote-pdfs',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own quote PDFs" on storage.objects;
drop policy if exists "Users can read own quote PDFs" on storage.objects;
drop policy if exists "Users can update own quote PDFs" on storage.objects;
drop policy if exists "Users can delete own quote PDFs" on storage.objects;

-- Path must be: {auth.uid()}/{quoteId}.pdf
create policy "Users can upload own quote PDFs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quote-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own quote PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'quote-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE is required for upsert: true (Create Quote / send-quote re-uploads).
create policy "Users can update own quote PDFs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'quote-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'quote-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own quote PDFs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'quote-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
