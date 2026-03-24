import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

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
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

    if (!['super_admin', 'admin'].includes(actor.role)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, role, company_id')
      .eq('id', userId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    if (actor.role !== 'super_admin' && targetUser.company_id !== actor.company_id) {
      return NextResponse.json({ error: 'Acces refuse pour cette entreprise' }, { status: 403 });
    }

    if (targetUser.role === 'super_admin' && actor.role !== 'super_admin') {
      return NextResponse.json({ error: 'Seul le super admin peut supprimer ce compte' }, { status: 403 });
    }

    const { error: dbError } = await adminClient.from('users').delete().eq('id', userId);
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
