import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Debug - à supprimer après
    if (!serviceKey) return NextResponse.json({ error: 'SERVICE_ROLE_KEY manquant' }, { status: 500 });
    if (!supabaseUrl) return NextResponse.json({ error: 'SUPABASE_URL manquant' }, { status: 500 });

    const { email, password, full_name, company_name, company_email, company_phone, modules } = await request.json();

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true,
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    const uid = authData.user.id;

    const { data: company, error: compError } = await admin.from('companies').insert({
      name: company_name,
      email: company_email || email,
      phone: company_phone || null,
      modules,
      plan: 'free',
      is_active: false,
    }).select().single();

    if (compError) {
      await admin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: 'Erreur company: ' + compError.message }, { status: 400 });
    }

    const { error: userError } = await admin.from('users').insert({
      id: uid,
      email,
      full_name,
      role: 'admin',
      company_id: (company as any).id,
      is_active: false,
    });

    if (userError) {
      await admin.auth.admin.deleteUser(uid);
      await admin.from('companies').delete().eq('id', (company as any).id);
      return NextResponse.json({ error: 'Erreur user: ' + userError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}