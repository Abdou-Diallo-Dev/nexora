import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, password, full_name, role, company_id, is_active, driver_id } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Créer dans auth.users directement avec service role
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const uid = data.user.id;

    // Upsert dans public.users
    await admin.from('users').upsert({
      id:         uid,
      email,
      full_name,
      role:       role       || 'driver',
      company_id: company_id || null,
      is_active:  is_active  ?? true,
    });

    // Force update au cas où le trigger aurait écrasé
    await admin.from('users').update({
      role:       role       || 'driver',
      company_id: company_id || null,
      is_active:  is_active  ?? true,
    }).eq('id', uid);

    // Si c'est un chauffeur, lier le user_id au driver
    if (driver_id) {
      await admin.from('drivers').update({ user_id: uid }).eq('id', driver_id);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
