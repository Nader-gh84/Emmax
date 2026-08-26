-- Migration: 045_transcription_jobs.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Video & Audio Translator:
--   - transcription_jobs: one processing job per media URL/upload
--   - transcript_segments: aligned original / English / Persian segments
--   - Private storage bucket: translator-media

-- =============================================================================
-- 1) transcription_jobs
-- =============================================================================

create table if not exists public.transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_url text,
  source_platform text not null default 'other',
  media_title text not null default '',
  storage_path text,
  detected_language text,
  media_duration_seconds numeric,
  status text not null default 'queued'
    check (status in (
      'queued',
      'getting_media',
      'extracting_audio',
      'detecting_language',
      'transcribing',
      'creating_english',
      'translating_persian',
      'finalizing',
      'completed',
      'failed'
    )),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status_message text not null default '',
  error_message text,
  failed_step text,
  needs_upload boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists transcription_jobs_user_created_idx
  on public.transcription_jobs (user_id, created_at desc);

create index if not exists transcription_jobs_user_status_idx
  on public.transcription_jobs (user_id, status);

alter table public.transcription_jobs enable row level security;

drop policy if exists "Users can view own transcription jobs" on public.transcription_jobs;
create policy "Users can view own transcription jobs"
  on public.transcription_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own transcription jobs" on public.transcription_jobs;
create policy "Users can insert own transcription jobs"
  on public.transcription_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own transcription jobs" on public.transcription_jobs;
create policy "Users can update own transcription jobs"
  on public.transcription_jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transcription jobs" on public.transcription_jobs;
create policy "Users can delete own transcription jobs"
  on public.transcription_jobs for delete
  using (auth.uid() = user_id);

comment on table public.transcription_jobs is
  'Video/audio translator jobs: full transcript + English + Persian.';

-- =============================================================================
-- 2) transcript_segments
-- =============================================================================

create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.transcription_jobs(id) on delete cascade not null,
  sequence integer not null,
  start_time numeric,
  end_time numeric,
  speaker text,
  original_text text not null default '',
  english_text text not null default '',
  persian_text text not null default '',
  created_at timestamptz not null default now(),
  unique (job_id, sequence)
);

create index if not exists transcript_segments_job_seq_idx
  on public.transcript_segments (job_id, sequence);

alter table public.transcript_segments enable row level security;

drop policy if exists "Users can view own transcript segments" on public.transcript_segments;
create policy "Users can view own transcript segments"
  on public.transcript_segments for select
  using (
    exists (
      select 1 from public.transcription_jobs j
      where j.id = transcript_segments.job_id
        and j.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own transcript segments" on public.transcript_segments;
create policy "Users can insert own transcript segments"
  on public.transcript_segments for insert
  with check (
    exists (
      select 1 from public.transcription_jobs j
      where j.id = transcript_segments.job_id
        and j.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own transcript segments" on public.transcript_segments;
create policy "Users can update own transcript segments"
  on public.transcript_segments for update
  using (
    exists (
      select 1 from public.transcription_jobs j
      where j.id = transcript_segments.job_id
        and j.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.transcription_jobs j
      where j.id = transcript_segments.job_id
        and j.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own transcript segments" on public.transcript_segments;
create policy "Users can delete own transcript segments"
  on public.transcript_segments for delete
  using (
    exists (
      select 1 from public.transcription_jobs j
      where j.id = transcript_segments.job_id
        and j.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3) Private storage bucket for uploaded / retrieved media
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'translator-media',
  'translator-media',
  false,
  524288000, -- 500 MB
  array[
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own translator media" on storage.objects;
create policy "Users can upload own translator media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'translator-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own translator media" on storage.objects;
create policy "Users can read own translator media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'translator-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own translator media" on storage.objects;
create policy "Users can update own translator media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'translator-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'translator-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own translator media" on storage.objects;
create policy "Users can delete own translator media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'translator-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
