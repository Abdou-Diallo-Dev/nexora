import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/store';

const ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'agent',
  'viewer',
  'comptable',
  'pdg',
  'responsable_operations',
  'tenant',
];

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
      admin.from('users').select('id'),
    ]);

    const existingIds = new Set((dbUsers || []).map((u: any) => u.id));
    let repaired = 0;
    const unresolved: { id: string; email: string }[] = [];

    for (const authUser of authUsers.users || []) {
      if (!authUser.id || existingIds.has(authUser.id)) continue;

      const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
      const role = typeof meta.role === 'string' ? meta.role as UserRole : undefined;
      const company_id = typeof meta.company_id === 'string' ? meta.company_id : null;
      const full_name =
        typeof meta.full_name === 'string' && meta.full_name.trim()
          ? meta.full_name.trim()
          : authUser.email?.split('@')[0] || 'Utilisateur';

      if (!role || !ALLOWED_ROLES.includes(role) || (role !== 'super_admin' && role !== 'tenant' && !company_id)) {
        unresolved.push({ id: authUser.id, email: authUser.email || '-' });
        continue;
      }

      const { error } = await admin.from('users').upsert({
        id: authUser.id,
        email: authUser.email || '',
        full_name,
        role,
        company_id,
        is_active: true,
      });

      if (error) {
        unresolved.push({ id: authUser.id, email: authUser.email || '-' });
        continue;
      }

      repaired += 1;
    }

    return NextResponse.json({ success: true, repaired, unresolved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
