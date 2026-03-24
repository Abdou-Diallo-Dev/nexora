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
      'tenant'
    )
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  resolved_role text := COALESCE(NULLIF(meta->>'role', ''), 'viewer');
  resolved_company_id uuid;
  resolved_full_name text := COALESCE(NULLIF(meta->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'Utilisateur');
  resolved_is_active boolean := COALESCE(
    CASE
      WHEN lower(COALESCE(meta->>'is_active', '')) = 'true' THEN true
      WHEN lower(COALESCE(meta->>'is_active', '')) = 'false' THEN false
      ELSE NULL
    END,
    true
  );
BEGIN
  IF resolved_role NOT IN (
    'super_admin',
    'admin',
    'manager',
    'agent',
    'viewer',
    'comptable',
    'pdg',
    'responsable_operations',
    'tenant'
  ) THEN
    resolved_role := 'viewer';
  END IF;

  IF NULLIF(meta->>'company_id', '') IS NOT NULL
     AND NULLIF(meta->>'company_id', '') ~* '^[0-9a-f-]{36}$' THEN
    resolved_company_id := (meta->>'company_id')::uuid;
  ELSE
    resolved_company_id := NULL;
  END IF;

  INSERT INTO public.users (id, email, full_name, role, company_id, is_active)
  VALUES (NEW.id, NEW.email, resolved_full_name, resolved_role, resolved_company_id, resolved_is_active)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

WITH auth_profiles AS (
  SELECT
    au.id,
    lower(COALESCE(au.email, '')) AS email,
    COALESCE(NULLIF(au.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(au.email, ''), '@', 1), 'Utilisateur') AS full_name,
    CASE
      WHEN au.raw_user_meta_data->>'role' IN (
        'super_admin',
        'admin',
        'manager',
        'agent',
        'viewer',
        'comptable',
        'pdg',
        'responsable_operations',
        'tenant'
      ) THEN au.raw_user_meta_data->>'role'
      ELSE NULL
    END AS role,
    CASE
      WHEN NULLIF(au.raw_user_meta_data->>'company_id', '') ~* '^[0-9a-f-]{36}$'
        THEN (au.raw_user_meta_data->>'company_id')::uuid
      ELSE NULL
    END AS company_id,
    COALESCE(
      CASE
        WHEN lower(COALESCE(au.raw_user_meta_data->>'is_active', '')) = 'true' THEN true
        WHEN lower(COALESCE(au.raw_user_meta_data->>'is_active', '')) = 'false' THEN false
        ELSE NULL
      END,
      true
    ) AS is_active
  FROM auth.users au
),
updated_users AS (
  UPDATE public.users u
  SET
    email = COALESCE(NULLIF(ap.email, ''), u.email),
    full_name = CASE
      WHEN ap.full_name IS NOT NULL
           AND (u.full_name IS NULL OR btrim(u.full_name) = '' OR u.full_name = split_part(COALESCE(u.email, ''), '@', 1))
        THEN ap.full_name
      ELSE u.full_name
    END,
    role = CASE
      WHEN ap.role IS NULL THEN u.role
      WHEN (u.role = 'admin' AND u.company_id IS NULL AND ap.role <> 'super_admin') OR u.role NOT IN (
        'super_admin',
        'admin',
        'manager',
        'agent',
        'viewer',
        'comptable',
        'pdg',
        'responsable_operations',
        'tenant'
      ) THEN ap.role
      ELSE u.role
    END,
    company_id = COALESCE(u.company_id, ap.company_id),
    is_active = COALESCE(u.is_active, ap.is_active)
  FROM auth_profiles ap
  WHERE u.id = ap.id
    AND ap.role IS NOT NULL
  RETURNING u.id
)
INSERT INTO public.users (id, email, full_name, role, company_id, is_active)
SELECT ap.id, ap.email, ap.full_name, ap.role, ap.company_id, ap.is_active
FROM auth_profiles ap
WHERE ap.role IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = ap.id)
  AND (ap.role IN ('super_admin', 'tenant') OR ap.company_id IS NOT NULL);
