-- Migration: 040_customer_avatars_supplier_logos.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Avatar / logo support:
--   1) customers: gender, avatar_url
--   2) private storage bucket: customer-avatars (images, 2 MB)
--   3) suppliers: logo_url
--   4) private storage bucket: supplier-logos (images, 2 MB)
--
-- Path conventions (stored in avatar_url / logo_url — not public URLs):
--   customer-avatars: {user_id}/{customer_id}/{timestamp}-{filename}
--   supplier-logos:   {user_id}/{supplier_id}/{timestamp}-{filename}

-- =============================================================================
-- 1) customers — gender + avatar_url
-- =============================================================================

alter table public.customers
  add column if not exists gender text not null default 'unspecified',
  add column if not exists avatar_url text;

alter table public.customers
  drop constraint if exists customers_gender_check;
alter table public.customers
  add constraint customers_gender_check
  check (gender in ('male', 'female', 'unspecified'));

comment on column public.customers.gender is
  'male | female | unspecified — selects illustrated avatar when no photo uploaded.';
comment on column public.customers.avatar_url is
  'Storage path in customer-avatars bucket (not a permanent public URL). Null = no photo.';

-- =============================================================================
-- 2) Storage bucket: customer-avatars
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-avatars',
  'customer-avatars',
  false,
  2097152, -- 2 MB
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

drop policy if exists "Users can upload own customer avatars" on storage.objects;
create policy "Users can upload own customer avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own customer avatars" on storage.objects;
create policy "Users can read own customer avatars"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own customer avatars" on storage.objects;
create policy "Users can update own customer avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own customer avatars" on storage.objects;
create policy "Users can delete own customer avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- 3) suppliers — logo_url
-- =============================================================================

alter table public.suppliers
  add column if not exists logo_url text;

comment on column public.suppliers.logo_url is
  'Storage path in supplier-logos bucket (not a permanent public URL). Null = no logo.';

-- =============================================================================
-- 4) Storage bucket: supplier-logos
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-logos',
  'supplier-logos',
  false,
  2097152, -- 2 MB
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

drop policy if exists "Users can upload own supplier logos" on storage.objects;
create policy "Users can upload own supplier logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'supplier-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own supplier logos" on storage.objects;
create policy "Users can read own supplier logos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'supplier-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own supplier logos" on storage.objects;
create policy "Users can update own supplier logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'supplier-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'supplier-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own supplier logos" on storage.objects;
create policy "Users can delete own supplier logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'supplier-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
