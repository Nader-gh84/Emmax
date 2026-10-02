-- Check whether migration 046 is applied.
-- Run after 046_final_invoices_and_labour_sell_rate.sql.
-- Each boolean should be true.

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quotes'
      and column_name = 'labour_sell_hourly_rate'
  ) as quotes_labour_sell_hourly_rate,

  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'labour_sell_hourly_rate'
  ) as projects_labour_sell_hourly_rate,

  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'final_invoices'
  ) as final_invoices_table,

  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'final_invoice_lines'
  ) as final_invoice_lines_table,

  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'next_final_invoice_number'
  ) as next_final_invoice_number_fn;
