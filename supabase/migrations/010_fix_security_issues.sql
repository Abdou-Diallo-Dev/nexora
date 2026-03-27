-- Fix Security Issues: Enable RLS and Create Proper Policies
-- This migration enables RLS on tables missing it and removes problematic SECURITY DEFINER views

-- 1. Enable RLS on tables without it
ALTER TABLE IF EXISTS public.supplier_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.logistics_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create simple RLS policies for supplier_order_items - allow authenticated users
DROP POLICY IF EXISTS "supplier_order_items_authenticated" ON public.supplier_order_items;
CREATE POLICY "supplier_order_items_authenticated" ON public.supplier_order_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Create simple RLS policies for logistics_invoice_items - allow authenticated users
DROP POLICY IF EXISTS "logistics_invoice_items_authenticated" ON public.logistics_invoice_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Fix SECURITY DEFINER views by recreating them without SECURITY DEFINER
-- These views should not override permissions

DROP VIEW IF EXISTS public.role_templates_view CASCADE;
CREATE OR REPLACE VIEW public.role_templates_view AS
SELECT t.id, t.name, t.description, t.permissions, t.created_at
FROM role_templates t
WHERE t.active = true;

DROP VIEW IF EXISTS public.maintenance_stock_summary CASCADE;
CREATE OR REPLACE VIEW public.maintenance_stock_summary AS
SELECT 
  ms.id, ms.company_id, ms.name, ms.category, ms.unit,
  ms.quantity, ms.min_quantity,
  CASE 
    WHEN ms.quantity = 0 THEN 'rupture'
    WHEN ms.quantity <= ms.min_quantity THEN 'critique'
    WHEN ms.quantity <= (ms.min_quantity * 1.5) THEN 'faible'
    ELSE 'ok'
  END as stock_level,
  ms.unit_cost, ms.supplier, ms.location, ms.notes
FROM maintenance_stock ms;

DROP VIEW IF EXISTS public.logistics_finance_summary CASCADE;
CREATE OR REPLACE VIEW public.logistics_finance_summary AS
SELECT 
  d.id, d.company_id, d.reference, d.status,
  d.final_price as amount,
  d.payment_status,
  d.created_at,
  lc.name as client_name
FROM deliveries d
LEFT JOIN logistics_clients lc ON d.client_id = lc.id;

DROP VIEW IF EXISTS public.company_directory CASCADE;
CREATE OR REPLACE VIEW public.company_directory AS
SELECT 
  u.id, u.company_id, u.email, u.first_name, u.last_name,
  u.phone, u.role, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.company_id IS NOT NULL;

-- Grant necessary permissions to authenticated users for views
GRANT SELECT ON public.role_templates_view TO authenticated;
GRANT SELECT ON public.maintenance_stock_summary TO authenticated;
GRANT SELECT ON public.logistics_finance_summary TO authenticated;
GRANT SELECT ON public.company_directory TO authenticated;

