-- Migration: 013_notifications_inbox_metadata.sql
-- ADDITIVE ONLY — already applied in production; kept in repo for history.
--
-- Controlled notification.type values:
--   'draft_quote'      — Voice Quote Builder Save to Draft
--   'quote_accepted'   — customer confirmed a pre-invoice (existing)
--   'supplier_price'   — supplier replied with material pricing (future)
--   'employee_clock'   — employee clock-in/out (future)

alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.notifications.metadata is
  'Type-specific payload for inbox items, e.g. { quote_number, customer_name, grand_total }.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_type_check'
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (
        type in (
          'draft_quote',
          'quote_accepted',
          'supplier_price',
          'employee_clock'
        )
      );
  end if;
end $$;
