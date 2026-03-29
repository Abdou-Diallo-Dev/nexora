-- ─── 1. Nouveaux types de biens ───────────────────────────────
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'villa';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'studio';

-- ─── 2. Champs terrain dans properties ────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ─── 3. Table employés immobilier ─────────────────────────────
CREATE TABLE IF NOT EXISTS re_employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  employee_type   VARCHAR(50) NOT NULL DEFAULT 'administration',
  post            VARCHAR(100),
  department      VARCHAR(100),
  salary          DECIMAL(12,2),
  hire_date       DATE,
  end_date        DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE re_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "re_employees_select" ON re_employees;
CREATE POLICY "re_employees_select" ON re_employees
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "re_employees_insert" ON re_employees;
CREATE POLICY "re_employees_insert" ON re_employees
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "re_employees_update" ON re_employees;
CREATE POLICY "re_employees_update" ON re_employees
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "re_employees_delete" ON re_employees;
CREATE POLICY "re_employees_delete" ON re_employees
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS re_employees_company_idx ON re_employees(company_id);
