insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-pdfs',
  'quote-pdfs',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

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

create policy "Users can update own quote PDFs"
  on storage.objects for update
  to authenticated
  using (
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
