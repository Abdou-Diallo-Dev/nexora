-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- rent_reminder, late_payment, receipt_available, lease_expiry
  channel TEXT NOT NULL, -- email, sms, whatsapp
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  subject TEXT,
  body TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_notifications" ON public.notifications FOR ALL 
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- ONLINE TRANSACTIONS TABLE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.online_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name TEXT,
  reference TEXT NOT NULL UNIQUE,
  amount NUMERIC(15,2) NOT NULL,
  provider TEXT NOT NULL, -- wave, orange_money, free_money, card
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  payment_url TEXT,
  provider_ref TEXT,
  webhook_data JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.online_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_transactions" ON public.online_transactions FOR ALL 
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- EXPENSES TABLE (if not exists)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  vendor TEXT,
  reference TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'validated',
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_expenses" ON public.expenses FOR ALL 
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY IF NOT EXISTS "property_images_public_read" ON storage.objects 
  FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY IF NOT EXISTS "property_images_auth_write" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "property_images_auth_delete" ON storage.objects 
  FOR DELETE USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "documents_auth" ON storage.objects 
  FOR ALL USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════
-- ADD MISSING COLUMNS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.rent_payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
