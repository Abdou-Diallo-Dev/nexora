-- Coller ce bloc à la place des deux DO $$ BEGIN FOREACH ... END $$ à la fin du fichier 001_initial.sql

-- ─── RLS policies for all company-scoped tables ───────────────
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY['tenants','leases','rent_payments','expenses','maintenance_tickets','notifications','online_transactions','clients','drivers','vehicles','orders','shipments','deliveries','inventory']
  LOOP
    EXECUTE format('CREATE POLICY "sel_%1$s" ON public.%1$s FOR SELECT USING (company_id = my_company_id() OR is_super_admin())', _tbl);
    EXECUTE format('CREATE POLICY "ins_%1$s" ON public.%1$s FOR INSERT WITH CHECK (company_id = my_company_id())', _tbl);
    EXECUTE format('CREATE POLICY "upd_%1$s" ON public.%1$s FOR UPDATE USING (company_id = my_company_id() OR is_super_admin())', _tbl);
    EXECUTE format('CREATE POLICY "del_%1$s" ON public.%1$s FOR DELETE USING (company_id = my_company_id() OR is_super_admin())', _tbl);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── updated_at triggers ──────────────────────────────────────
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY['users','properties','tenants','leases','rent_payments','expenses','maintenance_tickets','online_transactions','clients','drivers','vehicles','orders','inventory']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%1$s ON public.%1$s', _tbl);
    EXECUTE format('CREATE TRIGGER set_updated_at_%1$s BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', _tbl);
  END LOOP;
END $$;
