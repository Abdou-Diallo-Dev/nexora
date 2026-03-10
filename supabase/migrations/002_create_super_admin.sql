-- =============================================
-- CRÉER UN SUPER ADMIN
-- =============================================
-- Exécutez ce script dans l'éditeur SQL de Supabase APRÈS la migration 001
-- Remplacez les valeurs ci-dessous par les vôtres

-- Étape 1 : Créer l'utilisateur dans Supabase Auth (via le Dashboard Supabase)
--   → Authentication > Users > "Add user"
--   → Email: superadmin@votredomaine.com
--   → Password: MotDePasseSecure123!

-- Étape 2 : Récupérer l'ID de l'utilisateur créé, puis exécuter :

DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur Auth (remplacez l'email)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'superadmin@votredomaine.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé dans auth.users. Créez-le d''abord via le Dashboard Supabase.';
  END IF;

  -- Créer une entreprise "système" pour le super admin
  INSERT INTO companies (name, slug, email, modules, is_active, plan)
  VALUES ('Platform Admin', 'platform-admin', 'superadmin@votredomaine.com', ARRAY['real_estate', 'logistics'], true, 'enterprise')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_company_id;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM companies WHERE slug = 'platform-admin';
  END IF;

  -- Créer le profil super admin
  INSERT INTO users (id, email, full_name, company_id, role, is_active)
  VALUES (v_user_id, 'superadmin@votredomaine.com', 'Super Administrateur', v_company_id, 'super_admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true;

  RAISE NOTICE 'Super admin créé avec succès ! ID: %', v_user_id;
END;
$$;
