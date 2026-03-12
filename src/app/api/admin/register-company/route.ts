import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let uid: string | null = null;
  let companyId: string | null = null;

  try {
    const { email, password, full_name, company_name, company_email, company_phone, modules } = await request.json();

    if (!email || !password || !full_name || !company_name) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // Vérifier email déjà utilisé
    const { data: existing } = await admin.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });

    // 1. Créer la company
    const { data: company, error: compError } = await admin
      .from('companies')
      .insert({
        name:      company_name,
        email:     company_email || email,
        phone:     company_phone || null,
        modules:   modules || [],
        plan:      'free',
        is_active: false,
      })
      .select('id')
      .single();

    if (compError || !company) {
      return NextResponse.json({ error: 'Erreur création entreprise: ' + (compError?.message || 'inconnue') }, { status: 400 });
    }
    companyId = company.id;

    // 2. Créer le compte auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name, company_id: companyId, role: 'admin', is_active: false },
      email_confirm: true,
    });

    if (authError || !authData?.user) {
      await admin.from('companies').delete().eq('id', companyId);
      return NextResponse.json({ error: 'Erreur création compte: ' + (authError?.message || 'inconnue') }, { status: 400 });
    }
    uid = authData.user.id;

    // 3. Créer public.users
    const { error: userError } = await admin.from('users').upsert({
      id:         uid,
      email,
      full_name,
      role:       'admin',
      company_id: companyId,
      is_active:  false,
    });

    if (userError) {
      await admin.auth.admin.deleteUser(uid);
      await admin.from('companies').delete().eq('id', companyId);
      return NextResponse.json({ error: 'Erreur utilisateur: ' + userError.message }, { status: 400 });
    }

    // 4. Notifier le super admin par email
    const RESEND_KEY   = process.env.RESEND_API_KEY;
    const ADMIN_EMAIL  = process.env.SUPER_ADMIN_EMAIL;
    if (RESEND_KEY && ADMIN_EMAIL) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to:      ADMIN_EMAIL,
          subject: `🆕 Nouvelle demande — ${company_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
              <div style="background:#1e40af;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
                <h1 style="color:white;margin:0;font-size:22px">⚡ Nexora</h1>
              </div>
              <h2 style="color:#0f172a">Nouvelle demande d'inscription</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:10px;background:#f8fafc;font-weight:bold;color:#64748b">Entreprise</td><td style="padding:10px">${company_name}</td></tr>
                <tr><td style="padding:10px;background:#f1f5f9;font-weight:bold;color:#64748b">Responsable</td><td style="padding:10px">${full_name}</td></tr>
                <tr><td style="padding:10px;background:#f8fafc;font-weight:bold;color:#64748b">Email</td><td style="padding:10px">${email}</td></tr>
                <tr><td style="padding:10px;background:#f1f5f9;font-weight:bold;color:#64748b">Modules</td><td style="padding:10px">${(modules||[]).join(', ')}</td></tr>
              </table>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/super-admin/companies"
                 style="display:block;background:#1e40af;color:white;padding:14px;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:24px">
                Valider sur Nexora →
              </a>
            </div>
          `,
        }),
      }).catch(() => {});
    } else {
      console.log(`[NOUVELLE DEMANDE] ${company_name} | ${email} | Modules: ${(modules||[]).join(', ')}`);
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    try {
      if (uid) await admin.auth.admin.deleteUser(uid);
      else if (companyId) await admin.from('companies').delete().eq('id', companyId);
    } catch {}
    return NextResponse.json({ error: 'Erreur serveur: ' + e.message }, { status: 500 });
  }
}