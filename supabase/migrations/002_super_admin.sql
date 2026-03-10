-- ============================================================
-- Migration 002 : Créer votre compte Super Admin
-- ============================================================
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- APRÈS avoir créé votre compte via /auth/register
-- Remplacez 'votre@email.com' par votre email

UPDATE public.users
SET role = 'super_admin'
WHERE email = 'votre@email.com';

-- Vérification
SELECT id, full_name, email, role FROM public.users WHERE role = 'super_admin';

-- ============================================================
-- NOTE : Pour accéder au panel Super Admin :
-- 1. Mettez à jour votre email ci-dessus
-- 2. Exécutez ce SQL dans Supabase
-- 3. Reconnectez-vous à l'application
-- 4. Allez sur /super-admin
-- ============================================================
