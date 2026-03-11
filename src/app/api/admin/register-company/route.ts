import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, full_name, company_name, company_email, company_phone, modules } = await request.json();

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Créer l'utilisateur auth sans le connecter
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true, // pas besoin de confirmer l'email
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    const uid = authData.user.id;

    // 2. Créer la company
    const { data: company, error: compError } = await admin.from('companies').insert({
      name: company_name,
      email: company_email || email,
      phone: company_phone || null,
      modules,
      plan: 'free',
      is_active: false,
    }).select().single();

    if (compError) {
      // Rollback: supprimer l'user auth créé
      await admin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: compError.message }, { status: 400 });
    }

    // 3. Créer le profil user (inactif)
    const { error: userError } = await admin.from('users').insert({
      id: uid,
      email,
      full_name,
      role: 'admin',
      company_id: (company as any).id,
      is_active: false,
    });

    if (userError) {
      // Rollback
      await admin.auth.admin.deleteUser(uid);
      await admin.from('companies').delete().eq('id', (company as any).id);
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}