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

export async function POST(request: Request) {
  const authCheck = await getActor();
  if ('error' in authCheck) return authCheck.error;

  const { actor } = authCheck;

  try {
    const body = await request.json();
    const userId = String(body.userId || '').trim();
    const role = body.role as UserRole | undefined;
    const company_id = body.company_id === undefined ? undefined : (body.company_id ? String(body.company_id) : null);
    const is_active = body.is_active as boolean | undefined;
    const full_name = body.full_name === undefined ? undefined : String(body.full_name || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    if (!['super_admin', 'admin'].includes(actor.role)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: targetUser, error: targetError } = await admin
      .from('users')
      .select('id, role, company_id')
      .eq('id', userId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    if (actor.role !== 'super_admin') {
      if (targetUser.company_id !== actor.company_id) {
        return NextResponse.json({ error: 'Acces refuse pour cette entreprise' }, { status: 403 });
      }
      if (role === 'super_admin') {
        return NextResponse.json({ error: 'Seul le super admin peut promouvoir ce role' }, { status: 403 });
      }
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role invalide' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (role !== undefined) updates.role = role;
    if (company_id !== undefined) updates.company_id = actor.role === 'super_admin' ? company_id : actor.company_id;
    if (is_active !== undefined) updates.is_active = is_active;
    if (full_name !== undefined) updates.full_name = full_name;

    const { error: updateError } = await admin.from('users').update(updates).eq('id', userId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (full_name !== undefined) {
      await admin.auth.admin.updateUserById(userId, { user_metadata: { full_name } });
    }

    const { data: updatedUser, error: selectError } = await admin
      .from('users')
      .select('id, email, full_name, role, company_id, is_active, created_at, updated_at, companies(name)')
      .eq('id', userId)
      .maybeSingle();

    if (selectError || !updatedUser) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
