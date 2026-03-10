-- ─────────────────────────────────────────────────────────────
-- ImmoGest Pro – Initial Migration
-- ─────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── COMPANIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  address    TEXT,
  modules    TEXT[] DEFAULT ARRAY['real_estate','logistics'],
  plan       TEXT NOT NULL DEFAULT 'starter',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'admin'
               CHECK (role IN ('super_admin','admin','manager','agent','viewer')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROPERTIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.properties (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  zip_code         TEXT,
  country          TEXT DEFAULT 'Sénégal',
  type             TEXT NOT NULL DEFAULT 'apartment'
                     CHECK (type IN ('apartment','house','commercial','office','warehouse','land')),
  status           TEXT NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available','rented','maintenance','inactive')),
  owner_name       TEXT,
  owner_email      TEXT,
  owner_phone      TEXT,
  rent_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  charges_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  surface_area     NUMERIC(10,2),
  rooms_count      INTEGER,
  description      TEXT,
  images           TEXT[] DEFAULT '{}',
  amenities        TEXT[] DEFAULT '{}',
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TENANTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  birth_date       DATE,
  nationality      TEXT,
  id_document_url  TEXT,
  income_proof_url TEXT,
  guarantor_name   TEXT,
  guarantor_phone  TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LEASES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leases (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  rent_amount      NUMERIC(15,2) NOT NULL,
  charges_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  deposit_amount   NUMERIC(15,2),
  payment_day      INTEGER NOT NULL DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','terminated','expired','suspended')),
  contract_url     TEXT,
  signed_at        TIMESTAMPTZ,
  signature_url    TEXT,
  notes            TEXT,
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RENT PAYMENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lease_id         UUID NOT NULL REFERENCES public.leases(id) ON DELETE RESTRICT,
  period_month     INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year      INTEGER NOT NULL,
  amount           NUMERIC(15,2) NOT NULL,
  charges_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  due_date         DATE,
  paid_date        DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','late','partial','overdue')),
  payment_method   TEXT DEFAULT 'cash'
                     CHECK (payment_method IN ('cash','bank_transfer','wave','orange_money','free_money','check','other')),
  reference        TEXT,
  receipt_url      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, period_month, period_year)
);

-- ─── EXPENSES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id      UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  category         TEXT NOT NULL DEFAULT 'other'
                     CHECK (category IN ('fuel','electricity','supplies','maintenance','taxes','insurance','other')),
  amount           NUMERIC(15,2) NOT NULL,
  description      TEXT NOT NULL,
  date             DATE NOT NULL,
  vendor           TEXT,
  reference        TEXT,
  payment_method   TEXT DEFAULT 'cash',
  status           TEXT DEFAULT 'paid',
  notes            TEXT,
  receipt_url      TEXT,
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MAINTENANCE TICKETS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id      UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_id        UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT DEFAULT 'other',
  priority         TEXT NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low','medium','high','urgent')),
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','in_progress','resolved','closed')),
  images           TEXT[] DEFAULT '{}',
  estimated_cost   NUMERIC(15,2),
  actual_cost      NUMERIC(15,2),
  scheduled_date   DATE,
  completed_date   DATE,
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ONLINE TRANSACTIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.online_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  lease_id       UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id      UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name    TEXT,
  reference      TEXT NOT NULL UNIQUE,
  amount         NUMERIC(15,2) NOT NULL,
  provider       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','completed','failed','refunded')),
  payment_url    TEXT,
  provider_ref   TEXT,
  webhook_data   JSONB,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LOGISTICS TABLES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  address    TEXT,
  city       TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  license_num  TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id    UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  plate        TEXT NOT NULL,
  brand        TEXT,
  model        TEXT,
  year         INTEGER,
  capacity     NUMERIC(10,2),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','inactive')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  reference    TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  total_amount NUMERIC(15,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  driver_id    UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id   UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  reference    TEXT,
  origin       TEXT,
  destination  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_transit','delivered','returned','cancelled')),
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deliveries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shipment_id  UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  driver_id    UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  address      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','in_transit','delivered','failed')),
  delivered_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  sku          TEXT,
  quantity     NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit         TEXT DEFAULT 'pcs',
  location     TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_properties_company  ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_tenants_company     ON public.tenants(company_id);
CREATE INDEX IF NOT EXISTS idx_leases_company      ON public.leases(company_id);
CREATE INDEX IF NOT EXISTS idx_leases_property     ON public.leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant       ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease      ON public.rent_payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_company    ON public.rent_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company    ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_company     ON public.maintenance_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user         ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_company      ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company     ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company      ON public.orders(company_id);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory         ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies: companies
CREATE POLICY "company_select" ON public.companies FOR SELECT USING (
  id = my_company_id() OR is_super_admin()
);
CREATE POLICY "company_insert" ON public.companies FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "company_update" ON public.companies FOR UPDATE USING (
  id = my_company_id() OR is_super_admin()
);

-- Policies: users
CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  company_id = my_company_id() OR is_super_admin() OR id = auth.uid()
);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (
  company_id = my_company_id() OR is_super_admin()
);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
  id = auth.uid() OR company_id = my_company_id() OR is_super_admin()
);


-- ─── RLS policies (individual statements) ──────────────────

CREATE POLICY "sel_properties" ON public.properties FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_properties" ON public.properties FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_properties" ON public.properties FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_properties" ON public.properties FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_tenants" ON public.tenants FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_tenants" ON public.tenants FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_tenants" ON public.tenants FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_tenants" ON public.tenants FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_leases" ON public.leases FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_leases" ON public.leases FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_leases" ON public.leases FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_leases" ON public.leases FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_rent_payments" ON public.rent_payments FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_rent_payments" ON public.rent_payments FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_rent_payments" ON public.rent_payments FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_rent_payments" ON public.rent_payments FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_expenses" ON public.expenses FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_expenses" ON public.expenses FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_expenses" ON public.expenses FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_expenses" ON public.expenses FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_maintenance_tickets" ON public.maintenance_tickets FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_maintenance_tickets" ON public.maintenance_tickets FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_maintenance_tickets" ON public.maintenance_tickets FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_maintenance_tickets" ON public.maintenance_tickets FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_notifications" ON public.notifications FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_notifications" ON public.notifications FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_notifications" ON public.notifications FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_notifications" ON public.notifications FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_online_transactions" ON public.online_transactions FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_online_transactions" ON public.online_transactions FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_online_transactions" ON public.online_transactions FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_online_transactions" ON public.online_transactions FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_clients" ON public.clients FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_clients" ON public.clients FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_clients" ON public.clients FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_clients" ON public.clients FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_drivers" ON public.drivers FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_drivers" ON public.drivers FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_drivers" ON public.drivers FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_drivers" ON public.drivers FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_vehicles" ON public.vehicles FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_vehicles" ON public.vehicles FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_vehicles" ON public.vehicles FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_vehicles" ON public.vehicles FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_orders" ON public.orders FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_orders" ON public.orders FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_orders" ON public.orders FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_orders" ON public.orders FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_shipments" ON public.shipments FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_shipments" ON public.shipments FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_shipments" ON public.shipments FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_shipments" ON public.shipments FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_deliveries" ON public.deliveries FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_deliveries" ON public.deliveries FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_deliveries" ON public.deliveries FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_deliveries" ON public.deliveries FOR DELETE USING (company_id = my_company_id() OR is_super_admin());

CREATE POLICY "sel_inventory" ON public.inventory FOR SELECT USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "ins_inventory" ON public.inventory FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "upd_inventory" ON public.inventory FOR UPDATE USING (company_id = my_company_id() OR is_super_admin());
CREATE POLICY "del_inventory" ON public.inventory FOR DELETE USING (company_id = my_company_id() OR is_super_admin());


-- ─── TRIGGER: auto-create user profile on signup ──────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.users (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'admin',
      TRUE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── TRIGGER: updated_at ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_properties ON public.properties;
CREATE TRIGGER set_updated_at_properties BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_tenants ON public.tenants;
CREATE TRIGGER set_updated_at_tenants BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_leases ON public.leases;
CREATE TRIGGER set_updated_at_leases BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_rent_payments ON public.rent_payments;
CREATE TRIGGER set_updated_at_rent_payments BEFORE UPDATE ON public.rent_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_expenses ON public.expenses;
CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_maintenance_tickets ON public.maintenance_tickets;
CREATE TRIGGER set_updated_at_maintenance_tickets BEFORE UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_online_transactions ON public.online_transactions;
CREATE TRIGGER set_updated_at_online_transactions BEFORE UPDATE ON public.online_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_clients ON public.clients;
CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_drivers ON public.drivers;
CREATE TRIGGER set_updated_at_drivers BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_vehicles ON public.vehicles;
CREATE TRIGGER set_updated_at_vehicles BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON public.orders;
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_inventory ON public.inventory;
CREATE TRIGGER set_updated_at_inventory BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
