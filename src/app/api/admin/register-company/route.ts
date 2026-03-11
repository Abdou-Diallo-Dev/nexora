import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 7);
}

export async function POST(request: Request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey) return NextResponse.json({ error: 'SERVICE_ROLE_KEY manquant' }, { status: 500 });
    if (!supabaseUrl) return NextResponse.json({ error: 'SUPABASE_URL manquant' }, { status: 500 });

    const { email, password, full_name, company_name, company_email, company_phone, modules } = await request.json();

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Créer l'utilisateur auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true,
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    const uid = authData.user.id;

    // 2. Créer l'entreprise avec slug unique garanti
    const slug = generateSlug(company_name);
    const { data: company, error: compError } = await admin.from('companies').insert({
      name: company_name,
      email: company_email || email,
      phone: company_phone || null,
      modules,
      plan: 'free',
      is_active: false,
      slug,
    }).select().single();

    if (compError) {
      await admin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: 'Erreur company: ' + compError.message }, { status: 400 });
    }

    // 3. Créer l'utilisateur dans public.users
    const { error: userError } = await admin.from('users').upsert({
      id: uid,
      email,
      full_name,
      role: 'admin',
      company_id: (company as any).id,
      is_active: false,
    }).eq('id', uid);

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