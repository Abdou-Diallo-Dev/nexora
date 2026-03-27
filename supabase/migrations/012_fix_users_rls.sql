-- ===================================================
-- 012 : Fix users RLS — add self-read policy
-- ===================================================
-- The original migration only had "Company members can view their colleagues"
-- which uses (company_id = get_user_company_id()).  A user whose company_id is
-- null cannot satisfy this condition (NULL = NULL is unknown, not true), so they
-- can't read their own row → login shows "Profil introuvable" and layouts break.
--
-- This adds the missing "Users can read their own profile" policy.
-- ===================================================

-- Users: allow every authenticated user to read their own row
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Companies: allow reading the company that the current auth session belongs to
-- (belt-and-suspenders alongside the existing get_user_company_id() policy)
DROP POLICY IF EXISTS "Users can read own company direct" ON public.companies;
CREATE POLICY "Users can read own company direct"
  ON public.companies
  FOR SELECT TO authenticated
  USING (
    id = (
      SELECT company_id
      FROM   public.users
      WHERE  id = auth.uid()
      LIMIT  1
    )
  );
