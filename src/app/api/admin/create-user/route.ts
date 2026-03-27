import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/store';
import { USER_ROLES, buildAuthUserMetadata } from '@/lib/user-profiles';

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
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const full_name = String(body.full_name || '').trim();
    const role = body.role as UserRole | undefined;
    const requestedCompanyId = body.company_id ? String(body.company_id) : null;
    const is_active = body.is_active ?? true;
    const driver_id = body.driver_id ? String(body.driver_id) : null;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
    }

    if (!role || !USER_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role invalide' }, { status: 400 });
    }

    if (!['super_admin', 'admin'].includes(actor.role)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    if (role === 'super_admin' && actor.role !== 'super_admin') {
      return NextResponse.json({ error: 'Seul le super admin peut creer un super admin' }, { status: 403 });
    }

    const company_id = actor.role === 'super_admin' ? requestedCompanyId : actor.company_id;

    // Seul admin (non super_admin) a besoin d'une entreprise pour les rôles non-admin
    if (role !== 'super_admin' && !company_id && actor.role !== 'super_admin') {
      return NextResponse.json({ error: 'Entreprise requise pour ce role' }, { status: 400 });
    }

    const admin = createAdminClient();
    let createdUserId: string | null = null;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: buildAuthUserMetadata({ full_name, role, company_id, is_active: Boolean(is_active) }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    createdUserId = data.user.id;

    const { error: upsertError } = await admin.from('users').upsert({
      id: createdUserId,
      email,
      full_name,
      role,
      company_id,
      is_active,
    });

    if (upsertError) {
      await admin.auth.admin.deleteUser(createdUserId);
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    const { error: updateError } = await admin.from('users').update({
      full_name,
      role,
      company_id,
      is_active,
    }).eq('id', createdUserId);

    if (updateError) {
      await admin.from('users').delete().eq('id', createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (driver_id) {
      const { error: driverError } = await admin.from('drivers').update({ user_id: createdUserId }).eq('id', driver_id);
      if (driverError) {
        return NextResponse.json({ error: driverError.message }, { status: 400 });
      }
    }

    const { data: createdUser, error: selectError } = await admin
      .from('users')
      .select('id, email, full_name, role, company_id, is_active, created_at, updated_at, companies(name)')
      .eq('id', createdUserId)
      .maybeSingle();

    if (selectError || !createdUser) {
      return NextResponse.json({ success: true, userId: createdUserId });
    }

    return NextResponse.json({ success: true, user: createdUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
