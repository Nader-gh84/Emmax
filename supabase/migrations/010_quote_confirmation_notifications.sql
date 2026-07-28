alter table public.quotes
  add column if not exists confirmation_token uuid unique default gen_random_uuid(),
  add column if not exists confirmed_at timestamptz;

update public.quotes
set confirmation_token = gen_random_uuid()
where confirmation_token is null;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted'));

create index if not exists quotes_confirmation_token_idx
  on public.quotes (confirmation_token);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'quote_accepted',
  quote_id uuid references public.quotes(id) on delete set null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_unread_idx
  on public.notifications (user_id, read)
  where read = false;

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.notifications replica identity full;
