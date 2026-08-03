-- Migration: 022_notifications_delete_policy.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Existing notifications RLS (migration 010):
--   - SELECT own rows
--   - UPDATE own rows
--   - NO DELETE policy (this migration adds it)

create policy "Users can delete own notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);
