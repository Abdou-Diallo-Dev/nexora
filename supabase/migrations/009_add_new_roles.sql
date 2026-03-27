-- Add new roles to users_role_check constraint

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (
    role IN (
      'super_admin',
      'admin',
      'manager',
      'agent',
      'viewer',
      'comptable',
      'pdg',
      'responsable_operations',
      'tenant',
      -- Direction SARPA GROUP
      'directeur_operations',
      'directeur_financier',
      'directeur_juridique',
      'coordinatrice',
      -- Module Logistique
      'manager_logistique',
      'caissiere',
      'responsable_vente',
      'assistante_admin',
      -- Module Béton
      'manager_beton',
      'responsable_production',
      'operateur_centrale',
      'assistante_commerciale',
      'responsable_qualite'
    )
  );
