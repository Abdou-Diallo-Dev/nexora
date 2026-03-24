import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { getProfileSeedFromAuthUser, shouldRepairUserProfile } from '@/lib/user-profiles';

async function getActor() {
  const server = createServerSupabase();
  const { data: auth } = await server.auth.getUser();
  const authUser = auth.user;

  if (!authUser) {
    return { error: NextResponse.json({ error: 'Non authentifie' }, { status: 401 }) };
  }

  const { data: actor, error } = await server
    .from('users')
    .select('id, role, company_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error || !actor) {
    return { error: NextResponse.json({ error: 'Profil introuvable' }, { status: 403 }) };
  }

  return { actor };
}

export async function POST() {
  const authCheck = await getActor();
  if ('error' in authCheck) return authCheck.error;

  const { actor } = authCheck;
  if (!['super_admin', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const [{ data: authUsers }, { data: dbUsers }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from('users').select('id, email, full_name, role, company_id, is_active'),
    ]);

    const existingUsers = new Map((dbUsers || []).map((u: any) => [u.id, u]));
    let repaired = 0;
    const unresolved: { id: string; email: string; reason: string }[] = [];

    for (const authUser of authUsers.users || []) {
      if (!authUser.id) continue;

      const targetProfile = getProfileSeedFromAuthUser(authUser);
      if (!targetProfile) {
        unresolved.push({ id: authUser.id, email: authUser.email || '-', reason: 'metadata_incomplete' });
        continue;
      }

      const existingUser = existingUsers.get(authUser.id);
      if (!shouldRepairUserProfile(existingUser, targetProfile)) {
        continue;
      }

      const { error } = await admin.from('users').upsert({
        id: authUser.id,
        email: targetProfile.email,
        full_name: targetProfile.full_name,
        role: targetProfile.role,
        company_id: targetProfile.company_id,
        is_active: existingUser?.is_active ?? targetProfile.is_active,
      });

      if (error) {
        unresolved.push({ id: authUser.id, email: authUser.email || '-', reason: error.message });
        continue;
      }

      repaired += 1;
    }

    return NextResponse.json({ success: true, repaired, unresolved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
