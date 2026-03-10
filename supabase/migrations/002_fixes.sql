-- Fix 1: make due_date nullable (frontend may not always provide it)
ALTER TABLE public.rent_payments ALTER COLUMN due_date DROP NOT NULL;

-- Fix 2: make sure modules column has no enum constraint (it's TEXT[])
-- If modules was created with a check constraint, drop it
DO $$
BEGIN
  ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_modules_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Fix 3: ensure payment_method is nullable
ALTER TABLE public.rent_payments ALTER COLUMN payment_method DROP NOT NULL;
