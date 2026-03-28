-- ===================================================
-- 013 : Add custom_type + new status values to vehicles
-- ===================================================

-- 1. Ajouter la colonne custom_type
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS custom_type TEXT;

-- 2. Ajouter les nouvelles valeurs a l'enum
ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'operational';
ALTER TYPE public.vehicle_status ADD VALUE IF NOT EXISTS 'panne';
