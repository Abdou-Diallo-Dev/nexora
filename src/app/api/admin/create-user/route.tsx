import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { email, password, full_name, role, company_id, is_active } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
    }

    // 1. Créer dans auth.users avec service role (pas d'email de confirmation)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirmé directement, pas d'email envoyé
      user_metadata: {
        full_name,
        role:       role       || 'agent',
        company_id: company_id || null,
        is_active:  is_active  ?? true,
      },
    });

    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message || 'Erreur création compte' }, { status: 400 });
    }

    const uid = authData.user.id;

    // 2. Upsert dans public.users (au cas où le trigger aurait des valeurs par défaut)
    const { error: dbError } = await admin.from('users').upsert({
      id:         uid,
      email,
      full_name,
      role:       role       || 'agent',
      company_id: company_id || null,
      is_active:  is_active  ?? true,
    });

    if (dbError) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: 'Erreur DB: ' + dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: uid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}