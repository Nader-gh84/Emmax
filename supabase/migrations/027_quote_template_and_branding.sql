-- Migration: 027_quote_template_and_branding.sql
-- Quote PDF template preference + branding fields for PDF footers/headers.

alter table public.business_profiles
  add column if not exists quote_template text not null default 'classic_blue',
  add column if not exists tagline text not null default '',
  add column if not exists website text not null default '',
  add column if not exists address text not null default '';

alter table public.business_profiles
  drop constraint if exists business_profiles_quote_template_check;

alter table public.business_profiles
  add constraint business_profiles_quote_template_check
  check (quote_template in ('classic_blue', 'bold_green', 'modern_teal'));

comment on column public.business_profiles.quote_template is
  'Active Pre-Invoice/Quote PDF template: classic_blue | bold_green | modern_teal';
comment on column public.business_profiles.tagline is
  'Company tagline shown under company name on quote PDFs';
comment on column public.business_profiles.website is
  'Company website shown in quote PDF footers';
comment on column public.business_profiles.address is
  'Street / mailing address for quote PDF footers (city/country remain separate)';
