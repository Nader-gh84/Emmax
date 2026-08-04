-- Marks when a customer-facing quote PDF was prepared (Pre-Invoice step 4).
-- Distinct from supplier_pricing_uploaded_at (step 3) and sent_at (step 5).

alter table public.quotes
  add column if not exists quote_prepared_at timestamptz;

comment on column public.quotes.quote_prepared_at is
  'When the formal customer quote was prepared (PDF generated) for Pre-Invoice workflow step 4.';
