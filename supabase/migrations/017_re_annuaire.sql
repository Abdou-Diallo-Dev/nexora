-- ─── Contacts manuels (internes & externes) ───────────────────
CREATE TABLE IF NOT EXISTS re_contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type         VARCHAR(20) NOT NULL DEFAULT 'external', -- 'internal' | 'external'
  category     VARCHAR(50),   -- prestataire, notaire, banque, syndic, gardien, etc.
  first_name   VARCHAR(100),
  last_name    VARCHAR(100),
  company_name VARCHAR(200),  -- nom de la société si contact pro
  email        VARCHAR(255),
  phone        VARCHAR(50),
  phone2       VARCHAR(50),
  address      TEXT,
  notes        TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE re_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "re_contacts_select" ON re_contacts;
CREATE POLICY "re_contacts_select" ON re_contacts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "re_contacts_insert" ON re_contacts;
CREATE POLICY "re_contacts_insert" ON re_contacts
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "re_contacts_update" ON re_contacts;
CREATE POLICY "re_contacts_update" ON re_contacts
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "re_contacts_delete" ON re_contacts;
CREATE POLICY "re_contacts_delete" ON re_contacts
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS re_contacts_company_idx ON re_contacts(company_id);
CREATE INDEX IF NOT EXISTS re_contacts_type_idx    ON re_contacts(company_id, type);
