-- Migration: 045_cleanup_labour_markup_and_void_invoices.sql
-- Run in the Supabase SQL editor (do not auto-apply from the app).
--
-- Cleanup after pricing decisions:
--   1) Drop unused business_profiles.labour_markup_percent
--      (T&M customer labour uses the sell rate typed at Create Quote).
--   2) Allow supplier_invoices.status = 'voided' for order-linked soft-void.
--
-- Safe to re-run.

-- =============================================================================
-- 1) Drop labour markup (settings UI no longer writes this column)
-- =============================================================================

alter table public.business_profiles
  drop constraint if exists business_profiles_labour_markup_percent_check;

alter table public.business_profiles
  drop column if exists labour_markup_percent;

-- =============================================================================
-- 2) Soft-void supplier invoices
-- =============================================================================

alter table public.supplier_invoices
  drop constraint if exists supplier_invoices_status_check;

alter table public.supplier_invoices
  add constraint supplier_invoices_status_check
  check (status in ('pending_confirmation', 'confirmed', 'voided'));

comment on column public.supplier_invoices.status is
  'pending_confirmation = awaiting review; confirmed counts toward outstanding; '
  'voided = soft-removed (order-linked invoices are voided, not hard-deleted).';
