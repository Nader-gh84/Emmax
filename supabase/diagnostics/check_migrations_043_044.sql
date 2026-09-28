-- Check whether migrations 043 and 044 are applied on this Supabase project.
-- Run in the SQL editor. Each row should return true if that piece exists.
--
-- 043: labour quote estimates (entry_source, labour_billing_mode, margin warn)
-- 044: materials_markup_percent + labour_markup_percent (044's labour column
--      is dropped again by 045 — see labour_markup_still_present).

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'time_entries'
      and column_name = 'entry_source'
  ) as time_entries_entry_source,

  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quotes'
      and column_name = 'labour_billing_mode'
  ) as quotes_labour_billing_mode,

  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'labour_billing_mode'
  ) as projects_labour_billing_mode,

  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_profiles'
      and column_name = 'labour_margin_warn_percent'
  ) as labour_margin_warn_percent,

  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_profiles'
      and column_name = 'materials_markup_percent'
  ) as materials_markup_percent,

  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_profiles'
      and column_name = 'labour_markup_percent'
  ) as labour_markup_still_present,

  exists (
    select 1
    from pg_constraint
    where conname = 'supplier_invoices_status_check'
      and pg_get_constraintdef(oid) like '%voided%'
  ) as supplier_invoice_voided_allowed;
