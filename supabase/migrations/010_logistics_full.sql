-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 010 — MODULE LOGISTIQUE COMPLET
-- ═══════════════════════════════════════════════════════════════
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- AMÉLIORATION TABLE VEHICLES (colonnes manquantes)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS type           TEXT DEFAULT 'truck',
  ADD COLUMN IF NOT EXISTS capacity_kg    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fuel_type      TEXT DEFAULT 'diesel',
  ADD COLUMN IF NOT EXISTS mileage        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_expiry    DATE,
  ADD COLUMN IF NOT EXISTS inspection_expiry   DATE,
  ADD COLUMN IF NOT EXISTS parking_location    TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date  DATE,
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS color          TEXT,
  ADD COLUMN IF NOT EXISTS notes         TEXT;

-- ──────────────────────────────────────────────────────────────
-- DOCUMENTS VÉHICULES (assurance, carte grise, CT, vignette…)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id  UUID        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  -- 'assurance' | 'carte_grise' | 'controle_technique' | 'vignette' | 'autre'
  title       TEXT        NOT NULL,
  issue_date  DATE,
  expiry_date DATE,
  doc_url     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vdocs_company" ON public.vehicle_documents FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- MAINTENANCE VÉHICULES (réparations, vidange, entretien…)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id   UUID        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id    UUID        REFERENCES public.drivers(id),
  type         TEXT        NOT NULL DEFAULT 'entretien',
  -- 'reparation' | 'vidange' | 'entretien' | 'pneu' | 'frein' | 'controle_technique' | 'autre'
  description  TEXT,
  cost         NUMERIC(15,2) DEFAULT 0,
  mileage_at   INTEGER,
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  next_date    DATE,
  next_mileage INTEGER,
  status       TEXT        DEFAULT 'done',
  -- 'done' | 'planned' | 'in_progress'
  garage_name  TEXT,
  invoice_url  TEXT,
  notes        TEXT,
  created_by   UUID        REFERENCES public.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vmaint_company" ON public.vehicle_maintenance FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- STOCK MAINTENANCE (pneus, huile, frein, cartouche, lave-glace…)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_stock (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'autre',
  -- 'pneumatique' | 'lubrifiant' | 'frein' | 'filtre' | 'fluide' | 'electrique' | 'autre'
  unit          TEXT        DEFAULT 'unité',
  quantity      NUMERIC(10,2) DEFAULT 0,
  min_quantity  NUMERIC(10,2) DEFAULT 0,
  unit_price    NUMERIC(15,2) DEFAULT 0,
  supplier      TEXT,
  reference     TEXT,
  location      TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.maintenance_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mstock_company" ON public.maintenance_stock FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Mouvements de stock maintenance
CREATE TABLE IF NOT EXISTS public.maintenance_stock_movements (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stock_item_id       UUID        NOT NULL REFERENCES public.maintenance_stock(id) ON DELETE CASCADE,
  maintenance_id      UUID        REFERENCES public.vehicle_maintenance(id),
  movement_type       TEXT        NOT NULL, -- 'entree' | 'sortie'
  quantity            NUMERIC(10,2) NOT NULL,
  unit_price          NUMERIC(15,2),
  reason              TEXT,
  created_by          UUID        REFERENCES public.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.maintenance_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mstockmov_company" ON public.maintenance_stock_movements FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- STOCK DE VENTE (services rendus / plateau / rendu goder)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sale_stock (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL,
  -- 'services_rendus' | 'plateau' | 'rendu_goder'
  description   TEXT,
  unit          TEXT        DEFAULT 'unité',
  quantity      NUMERIC(10,2) DEFAULT 0,
  min_quantity  NUMERIC(10,2) DEFAULT 0,
  unit_price    NUMERIC(15,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sale_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salestock_company" ON public.sale_stock FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Mouvements stock de vente
CREATE TABLE IF NOT EXISTS public.sale_stock_movements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stock_item_id   UUID        NOT NULL REFERENCES public.sale_stock(id) ON DELETE CASCADE,
  delivery_id     UUID        REFERENCES public.deliveries(id),
  movement_type   TEXT        NOT NULL, -- 'entree' | 'sortie'
  quantity        NUMERIC(10,2) NOT NULL,
  unit_price      NUMERIC(15,2),
  reason          TEXT,
  created_by      UUID        REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sale_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salestockmov_company" ON public.sale_stock_movements FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- SUIVI GPS (positions véhicules / rapports de trajet)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gps_tracking (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id    UUID        REFERENCES public.vehicles(id),
  driver_id     UUID        REFERENCES public.drivers(id),
  delivery_id   UUID        REFERENCES public.deliveries(id),
  lat           NUMERIC(10,7),
  lng           NUMERIC(10,7),
  address       TEXT,
  speed_kmh     NUMERIC(6,2),
  mileage       INTEGER,
  status        TEXT        DEFAULT 'moving',
  -- 'moving' | 'stopped' | 'idle' | 'offline'
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.gps_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gps_company" ON public.gps_tracking FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- COMMANDES FOURNISSEURS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reference        TEXT        NOT NULL,
  supplier_name    TEXT        NOT NULL,
  supplier_contact TEXT,
  supplier_phone   TEXT,
  supplier_email   TEXT,
  status           TEXT        DEFAULT 'pending',
  -- 'pending' | 'confirmed' | 'received' | 'partial' | 'cancelled'
  category         TEXT        DEFAULT 'general',
  -- 'maintenance' | 'vente' | 'carburant' | 'general'
  order_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_date    DATE,
  received_date    DATE,
  total_amount     NUMERIC(15,2) DEFAULT 0,
  paid_amount      NUMERIC(15,2) DEFAULT 0,
  payment_status   TEXT        DEFAULT 'unpaid',
  -- 'unpaid' | 'partial' | 'paid'
  invoice_url      TEXT,
  notes            TEXT,
  created_by       UUID        REFERENCES public.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sorders_company" ON public.supplier_orders FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

CREATE TABLE IF NOT EXISTS public.supplier_order_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit        TEXT        DEFAULT 'unité',
  unit_price  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes       TEXT
);

-- ──────────────────────────────────────────────────────────────
-- FINANCES — COMPTES BANCAIRES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  bank_name      TEXT        NOT NULL,
  account_number TEXT,
  iban           TEXT,
  currency       TEXT        DEFAULT 'XOF',
  balance        NUMERIC(15,2) DEFAULT 0,
  is_active      BOOLEAN     DEFAULT true,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "baccounts_company" ON public.bank_accounts FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Transactions / Relevé bancaire
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id  UUID        NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL, -- 'credit' | 'debit'
  amount           NUMERIC(15,2) NOT NULL,
  date             DATE        NOT NULL DEFAULT CURRENT_DATE,
  description      TEXT,
  reference        TEXT,
  category         TEXT,
  -- 'livraison' | 'salaire' | 'carburant' | 'maintenance' | 'fournisseur' | 'autre'
  cheque_number    TEXT,
  is_reconciled    BOOLEAN     DEFAULT false,
  notes            TEXT,
  created_by       UUID        REFERENCES public.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "btransac_company" ON public.bank_transactions FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Rapprochement bancaire
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id  UUID        NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  period_month     INTEGER     NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year      INTEGER     NOT NULL,
  opening_balance  NUMERIC(15,2) DEFAULT 0,
  closing_balance  NUMERIC(15,2) DEFAULT 0,
  bank_balance     NUMERIC(15,2) DEFAULT 0,
  difference       NUMERIC(15,2) GENERATED ALWAYS AS (closing_balance - bank_balance) STORED,
  status           TEXT        DEFAULT 'open', -- 'open' | 'reconciled'
  notes            TEXT,
  reconciled_by    UUID        REFERENCES public.users(id),
  reconciled_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_account_id, period_year, period_month)
);
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brecon_company" ON public.bank_reconciliations FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Budget mensuel / objectifs
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year           INTEGER     NOT NULL,
  month          INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  category       TEXT        NOT NULL,
  -- 'revenus' | 'carburant' | 'maintenance' | 'salaires' | 'fournisseurs' | 'autre'
  label          TEXT,
  budget_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount  NUMERIC(15,2) DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year, month, category)
);
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_company" ON public.monthly_budgets FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- FACTURES CLIENTS LOGISTIQUE
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logistics_invoices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id       UUID        REFERENCES public.clients(id),
  delivery_id     UUID        REFERENCES public.deliveries(id),
  reference       TEXT        NOT NULL,
  status          TEXT        DEFAULT 'draft',
  -- 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  paid_date       DATE,
  subtotal        NUMERIC(15,2) DEFAULT 0,
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  total_amount    NUMERIC(15,2) DEFAULT 0,
  paid_amount     NUMERIC(15,2) DEFAULT 0,
  payment_method  TEXT,
  notes           TEXT,
  pdf_url         TEXT,
  created_by      UUID        REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.logistics_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "linvoices_company" ON public.logistics_invoices FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

CREATE TABLE IF NOT EXISTS public.logistics_invoice_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID        NOT NULL REFERENCES public.logistics_invoices(id) ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  quantity     NUMERIC(10,2) DEFAULT 1,
  unit_price   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price  NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ──────────────────────────────────────────────────────────────
-- DETTES CLIENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_debts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id      UUID        REFERENCES public.clients(id),
  client_name    TEXT,
  invoice_id     UUID        REFERENCES public.logistics_invoices(id),
  delivery_id    UUID        REFERENCES public.deliveries(id),
  amount         NUMERIC(15,2) NOT NULL,
  paid_amount    NUMERIC(15,2) DEFAULT 0,
  due_date       DATE,
  status         TEXT        DEFAULT 'pending',
  -- 'pending' | 'partial' | 'paid' | 'overdue'
  origin         TEXT        DEFAULT 'livraison',
  -- 'livraison' | 'facture' | 'autre'
  notes          TEXT,
  created_by     UUID        REFERENCES public.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.client_debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debts_company" ON public.client_debts FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- ACCIDENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accidents (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id              UUID        REFERENCES public.vehicles(id),
  driver_id               UUID        REFERENCES public.drivers(id),
  delivery_id             UUID        REFERENCES public.deliveries(id),
  date                    TIMESTAMPTZ NOT NULL,
  location                TEXT,
  type                    TEXT        DEFAULT 'collision',
  -- 'collision' | 'renversement' | 'vol' | 'incendie' | 'bris_glace' | 'autre'
  severity                TEXT        DEFAULT 'minor',
  -- 'minor' | 'moderate' | 'serious' | 'fatal'
  description             TEXT,
  third_party_involved    BOOLEAN     DEFAULT false,
  third_party_info        TEXT,
  injuries                BOOLEAN     DEFAULT false,
  injuries_description    TEXT,
  police_report_number    TEXT,
  insurance_claim_number  TEXT,
  estimated_damage        NUMERIC(15,2),
  repair_cost             NUMERIC(15,2),
  status                  TEXT        DEFAULT 'open',
  -- 'open' | 'in_progress' | 'closed'
  photos                  TEXT[]      DEFAULT '{}',
  documents               TEXT[]      DEFAULT '{}',
  notes                   TEXT,
  created_by              UUID        REFERENCES public.users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accidents_company" ON public.accidents FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- EMPLOYÉS (administration + chauffeurs regroupés)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logistics_employees (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id       UUID        REFERENCES public.drivers(id),
  user_id         UUID        REFERENCES public.users(id),
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  email           TEXT,
  phone           TEXT,
  category        TEXT        NOT NULL DEFAULT 'administration',
  -- 'administration' | 'chauffeur' | 'technique'
  position        TEXT,
  hire_date       DATE,
  salary          NUMERIC(15,2),
  salary_type     TEXT        DEFAULT 'mensuel',
  -- 'mensuel' | 'journalier' | 'hebdomadaire'
  contract_type   TEXT,
  -- 'CDI' | 'CDD' | 'Stage' | 'Freelance'
  contract_url    TEXT,
  id_number       TEXT,
  is_active       BOOLEAN     DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.logistics_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_company" ON public.logistics_employees FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- RAPPORTS DE SORTIE (départs véhicules, consommation carburant)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departure_reports (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id         UUID        REFERENCES public.drivers(id),
  vehicle_id        UUID        REFERENCES public.vehicles(id),
  delivery_id       UUID        REFERENCES public.deliveries(id),
  departure_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  return_date       TIMESTAMPTZ,
  departure_km      INTEGER,
  return_km         INTEGER,
  km_traveled       INTEGER     GENERATED ALWAYS AS (
    CASE WHEN return_km IS NOT NULL AND departure_km IS NOT NULL
    THEN return_km - departure_km ELSE NULL END
  ) STORED,
  fuel_liters       NUMERIC(10,2),
  fuel_cost         NUMERIC(15,2),
  tolls             NUMERIC(15,2) DEFAULT 0,
  other_expenses    NUMERIC(15,2) DEFAULT 0,
  total_expenses    NUMERIC(15,2) GENERATED ALWAYS AS (
    COALESCE(fuel_cost,0) + COALESCE(tolls,0) + COALESCE(other_expenses,0)
  ) STORED,
  route_description TEXT,
  status            TEXT        DEFAULT 'open', -- 'open' | 'closed'
  notes             TEXT,
  created_by        UUID        REFERENCES public.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.departure_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "depreports_company" ON public.departure_reports FOR ALL USING (
  company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- ──────────────────────────────────────────────────────────────
-- VUES UTILITAIRES
-- ──────────────────────────────────────────────────────────────

-- Annuaire global (tous les contacts de la DB)
CREATE OR REPLACE VIEW public.company_directory AS
SELECT
  c.id       AS company_id,
  'client'   AS type,
  cl.id      AS record_id,
  cl.name    AS full_name,
  cl.phone,
  cl.email,
  'Client logistique'   AS category,
  cl.created_at
FROM public.clients cl
JOIN public.companies c ON c.id = cl.company_id

UNION ALL

SELECT
  d.company_id,
  'driver',
  d.id,
  d.first_name || ' ' || d.last_name,
  d.phone,
  d.email,
  'Chauffeur',
  d.created_at
FROM public.drivers d

UNION ALL

SELECT
  e.company_id,
  'employee',
  e.id,
  e.first_name || ' ' || e.last_name,
  e.phone,
  e.email,
  CASE e.category
    WHEN 'administration' THEN 'Administration'
    WHEN 'chauffeur'      THEN 'Chauffeur'
    ELSE 'Technique'
  END,
  e.created_at
FROM public.logistics_employees e

UNION ALL

SELECT
  u.company_id,
  'user',
  u.id,
  u.full_name,
  NULL,
  u.email,
  u.role::TEXT,
  u.created_at
FROM public.users u
WHERE u.company_id IS NOT NULL;

GRANT SELECT ON public.company_directory TO authenticated;

-- Vue résumé stock maintenance (niveau d'alerte)
CREATE OR REPLACE VIEW public.maintenance_stock_summary AS
SELECT
  ms.*,
  COALESCE(SUM(CASE WHEN msm.movement_type='entree' THEN msm.quantity ELSE -msm.quantity END), 0) AS computed_quantity,
  CASE
    WHEN ms.quantity <= 0                 THEN 'rupture'
    WHEN ms.quantity <= ms.min_quantity   THEN 'critique'
    WHEN ms.quantity <= ms.min_quantity*2 THEN 'faible'
    ELSE 'ok'
  END AS stock_level
FROM public.maintenance_stock ms
LEFT JOIN public.maintenance_stock_movements msm ON msm.stock_item_id = ms.id
GROUP BY ms.id;

GRANT SELECT ON public.maintenance_stock_summary TO authenticated;

-- Vue tableau de bord finances
CREATE OR REPLACE VIEW public.logistics_finance_summary AS
SELECT
  ba.company_id,
  ba.id AS account_id,
  ba.name AS account_name,
  ba.bank_name,
  ba.balance AS book_balance,
  COALESCE(SUM(CASE WHEN bt.type='credit' THEN bt.amount ELSE 0 END), 0) AS total_credits,
  COALESCE(SUM(CASE WHEN bt.type='debit'  THEN bt.amount ELSE 0 END), 0) AS total_debits,
  COUNT(bt.id) AS transaction_count
FROM public.bank_accounts ba
LEFT JOIN public.bank_transactions bt ON bt.bank_account_id = ba.id
GROUP BY ba.company_id, ba.id, ba.name, ba.bank_name, ba.balance;

GRANT SELECT ON public.logistics_finance_summary TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- INDEX PERFORMANCE
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vmaint_vehicle    ON public.vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vmaint_company    ON public.vehicle_maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_vmaint_date       ON public.vehicle_maintenance(date);
CREATE INDEX IF NOT EXISTS idx_mstock_company    ON public.maintenance_stock(company_id);
CREATE INDEX IF NOT EXISTS idx_salestock_company ON public.sale_stock(company_id);
CREATE INDEX IF NOT EXISTS idx_sorders_company   ON public.supplier_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_btransac_account  ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_btransac_date     ON public.bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_invoices_company  ON public.logistics_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client   ON public.logistics_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_debts_company     ON public.client_debts(company_id);
CREATE INDEX IF NOT EXISTS idx_accidents_company ON public.accidents(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON public.logistics_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_depreports_company ON public.departure_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_depreports_date   ON public.departure_reports(departure_date);
CREATE INDEX IF NOT EXISTS idx_gps_vehicle       ON public.gps_tracking(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_recorded      ON public.gps_tracking(recorded_at);

-- ──────────────────────────────────────────────────────────────
-- DONNÉES PAR DÉFAUT — Stock maintenance (articles courants)
-- À adapter selon vos besoins
-- ──────────────────────────────────────────────────────────────
-- (Insérer manuellement après avoir la company_id)
-- INSERT INTO public.maintenance_stock (company_id, name, category, unit, min_quantity, unit_price) VALUES
--   ('YOUR_COMPANY_ID', 'Pneu 315/80 R22.5',    'pneumatique', 'pièce', 4,  85000),
--   ('YOUR_COMPANY_ID', 'Huile moteur 15W40',    'lubrifiant',  'litre', 20, 3500),
--   ('YOUR_COMPANY_ID', 'Plaquettes de frein',   'frein',       'jeu',   2,  45000),
--   ('YOUR_COMPANY_ID', 'Filtre à huile',        'filtre',      'pièce', 5,  8000),
--   ('YOUR_COMPANY_ID', 'Filtre à air',          'filtre',      'pièce', 3,  12000),
--   ('YOUR_COMPANY_ID', 'Filtre à carburant',    'filtre',      'pièce', 3,  6000),
--   ('YOUR_COMPANY_ID', 'Lave-glace',            'fluide',      'litre', 10, 1500),
--   ('YOUR_COMPANY_ID', 'Liquide de frein',      'fluide',      'litre', 5,  4500),
--   ('YOUR_COMPANY_ID', 'Cartouche de graisse',  'lubrifiant',  'kg',    10, 8000),
--   ('YOUR_COMPANY_ID', 'Ampoule phare H4',      'electrique',  'pièce', 6,  3000);
