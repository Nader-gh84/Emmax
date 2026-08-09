-- Migration: 039_customer_detail_extensions.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Customer Detail extensions:
--   1) customers: customer_type, website
--   2) customer_documents (+ private storage bucket customer-documents)
--   3) customer_notes (+ backfill from customers.notes)
--
-- Notes:
--   - customers.notes is left in place as legacy; new UI uses customer_notes.
--   - Document paths: {user_id}/{customer_id}/{timestamp}-{filename}

-- =============================================================================
-- 1) customers — type + website
-- =============================================================================

alter table public.customers
  add column if not exists customer_type text not null default 'residential',
  add column if not exists website text;

alter table public.customers
  drop constraint if exists customers_customer_type_check;
alter table public.customers
  add constraint customers_customer_type_check
  check (customer_type in ('residential', 'commercial'));

comment on column public.customers.customer_type is
  'residential | commercial — shown on Customer Detail sidebar.';
comment on column public.customers.website is
  'Optional customer website URL.';

-- =============================================================================
-- 2) customer_documents
-- =============================================================================

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists customer_documents_customer_id_idx
  on public.customer_documents (customer_id, uploaded_at desc);
create index if not exists customer_documents_user_id_idx
  on public.customer_documents (user_id);

comment on table public.customer_documents is
  'Files uploaded on Customer Detail (private customer-documents bucket).';
comment on column public.customer_documents.file_path is
  'Storage path in customer-documents bucket (not a permanent public URL).';

alter table public.customer_documents enable row level security;

drop policy if exists "Users can view own customer_documents"
  on public.customer_documents;
create policy "Users can view own customer_documents"
  on public.customer_documents for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own customer_documents"
  on public.customer_documents;
create policy "Users can insert own customer_documents"
  on public.customer_documents for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own customer_documents"
  on public.customer_documents;
create policy "Users can update own customer_documents"
  on public.customer_documents for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own customer_documents"
  on public.customer_documents;
create policy "Users can delete own customer_documents"
  on public.customer_documents for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 3) Storage bucket: customer-documents
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-documents',
  'customer-documents',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own customer documents" on storage.objects;
create policy "Users can upload own customer documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own customer documents" on storage.objects;
create policy "Users can read own customer documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own customer documents" on storage.objects;
create policy "Users can update own customer documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own customer documents" on storage.objects;
create policy "Users can delete own customer documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- 4) customer_notes + backfill from customers.notes
-- =============================================================================

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  note_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_id_idx
  on public.customer_notes (customer_id, created_at desc);
create index if not exists customer_notes_user_id_idx
  on public.customer_notes (user_id);

comment on table public.customer_notes is
  'Multi-entry notes for Customer Detail (replaces single customers.notes for new writes).';

alter table public.customer_notes enable row level security;

drop policy if exists "Users can view own customer_notes" on public.customer_notes;
create policy "Users can view own customer_notes"
  on public.customer_notes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own customer_notes" on public.customer_notes;
create policy "Users can insert own customer_notes"
  on public.customer_notes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own customer_notes" on public.customer_notes;
create policy "Users can update own customer_notes"
  on public.customer_notes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own customer_notes" on public.customer_notes;
create policy "Users can delete own customer_notes"
  on public.customer_notes for delete to authenticated
  using (auth.uid() = user_id);

-- One-time backfill: legacy customers.notes → first customer_notes row when empty.
insert into public.customer_notes (user_id, customer_id, note_text, created_at)
select
  c.user_id,
  c.id,
  trim(c.notes),
  coalesce(c.created_at, now())
from public.customers c
where c.notes is not null
  and trim(c.notes) <> ''
  and not exists (
    select 1
    from public.customer_notes n
    where n.customer_id = c.id
  );

notify pgrst, 'reload schema';
