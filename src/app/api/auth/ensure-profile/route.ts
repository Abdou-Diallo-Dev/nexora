import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { getProfileSeedFromAuthUser, shouldRepairUserProfile } from '@/lib/user-profiles';

export async function POST() {
  try {
    const server = createServerSupabase();
    const { data: auth } = await server.auth.getUser();
    const authUser = auth.user;

    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('users')
      .select('id, email, full_name, role, company_id, is_active, created_at, updated_at')
      .eq('id', authUser.id)
      .maybeSingle();

    const targetProfile = getProfileSeedFromAuthUser(authUser);
    if (!targetProfile) {
      return NextResponse.json({ error: 'Profil incomplet' }, { status: 409 });
    }

    if (!shouldRepairUserProfile(existing, targetProfile)) {
      return NextResponse.json({ success: true, user: existing, repaired: false });
    }

    const { error: upsertError } = await admin.from('users').upsert({
      id: authUser.id,
      email: targetProfile.email,
      full_name: targetProfile.full_name,
      role: targetProfile.role,
      company_id: targetProfile.company_id,
      is_active: existing?.is_active ?? targetProfile.is_active,
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    const { data: repairedUser, error: selectError } = await admin
      .from('users')
      .select('id, email, full_name, role, company_id, is_active, created_at, updated_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (selectError || !repairedUser) {
      return NextResponse.json({ error: 'Profil toujours introuvable' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: repairedUser, repaired: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
