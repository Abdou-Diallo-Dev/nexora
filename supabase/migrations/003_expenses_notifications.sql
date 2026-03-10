-- Table expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  vendor TEXT,
  reference TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'validated',
  notes TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_expenses" ON public.expenses FOR ALL USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Bucket pour les photos de biens
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true) ON CONFLICT DO NOTHING;
CREATE POLICY "property_images_public" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "property_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');
CREATE POLICY "property_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Ajout colonne status aux tenants si manquant
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Ajout colonne assigned_to aux maintenance_tickets
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS assigned_to TEXT;
