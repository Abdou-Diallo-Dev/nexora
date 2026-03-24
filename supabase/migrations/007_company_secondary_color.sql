alter table public.companies
  add column if not exists secondary_color text;

update public.companies
set secondary_color = coalesce(nullif(secondary_color, ''), '#0f766e');
