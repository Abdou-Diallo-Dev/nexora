-- ===================================================
-- 011 : Table logistics_orders (Commandes clients)
-- ===================================================

create table if not exists public.logistics_orders (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  reference     text unique,
  client_id     uuid references public.logistics_clients(id) on delete set null,
  status        text not null default 'draft'
                  check (status in ('draft','confirmed','in_progress','completed','cancelled')),
  priority      text not null default 'normal'
                  check (priority in ('normal','express','urgent')),
  pickup_address   text not null,
  pickup_city      text,
  delivery_address text not null,
  delivery_city    text,
  goods_type        text,
  goods_description text,
  weight_kg         numeric(10,2),
  volume_m3         numeric(10,2),
  quantity          integer,
  amount            numeric(12,2) not null default 0,
  payment_method    text default 'cash'
                      check (payment_method in ('cash','wave','orange_money','free_money','credit')),
  payment_status    text not null default 'pending'
                      check (payment_status in ('pending','paid','partial')),
  scheduled_date    date,
  notes             text,
  created_by        uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-generate reference: CMD-YYYYMM-0001
create or replace function public.generate_logistics_order_reference()
returns trigger language plpgsql as $$
declare
  prefix text := 'CMD-' || to_char(now(), 'YYYYMM') || '-';
  seq    int;
begin
  select coalesce(max(
    (regexp_match(reference, 'CMD-\d{6}-(\d+)'))[1]::int
  ), 0) + 1
  into seq
  from public.logistics_orders
  where reference like prefix || '%';

  new.reference := prefix || lpad(seq::text, 4, '0');
  return new;
end;
$$;

create trigger trg_logistics_order_reference
  before insert on public.logistics_orders
  for each row
  when (new.reference is null)
  execute function public.generate_logistics_order_reference();

-- updated_at trigger
create or replace function public.set_logistics_order_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger trg_logistics_order_updated_at
  before update on public.logistics_orders
  for each row execute function public.set_logistics_order_updated_at();

-- Indexes
create index if not exists idx_logistics_orders_company on public.logistics_orders(company_id);
create index if not exists idx_logistics_orders_client  on public.logistics_orders(client_id);
create index if not exists idx_logistics_orders_status  on public.logistics_orders(status);

-- RLS
alter table public.logistics_orders enable row level security;

create policy "logistics_orders_company_isolation"
  on public.logistics_orders
  for all
  using (
    company_id = (
      select company_id from public.users where id = auth.uid()
    )
  );
