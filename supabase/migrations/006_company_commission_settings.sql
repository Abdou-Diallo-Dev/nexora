alter table public.companies
  add column if not exists commission_rate numeric(8,2) not null default 10,
  add column if not exists commission_mode text not null default 'ttc',
  add column if not exists vat_rate numeric(8,2) not null default 18;

update public.companies
set
  commission_rate = coalesce(commission_rate, 10),
  commission_mode = coalesce(nullif(commission_mode, ''), 'ttc'),
  vat_rate = coalesce(vat_rate, 18);

alter table public.companies
  drop constraint if exists companies_commission_mode_check;

alter table public.companies
  add constraint companies_commission_mode_check
  check (commission_mode in ('none', 'ht', 'ttc'));
