CREATE TABLE IF NOT EXISTS public.field_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  role TEXT NOT NULL,
  role_label TEXT,
  activity_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  property_name TEXT,
  apartment_name TEXT,
  activity_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(15,2),
  bank_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.field_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_field_activities" ON public.field_activities;
CREATE POLICY "company_field_activities" ON public.field_activities
  FOR ALL
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_field_activities_company_date
  ON public.field_activities(company_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_field_activities_role
  ON public.field_activities(company_id, role);
