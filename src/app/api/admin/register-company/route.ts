import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const admin = createAdminClient();

  let uid: string | null = null;
  let companyId: string | null = null;

  try {
    const { email, password, full_name, company_name, company_email, company_phone, modules } = await request.json();

    if (!email || !password || !full_name || !company_name) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

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
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError || !authData?.user) {
      await admin.from('companies').delete().eq('id', companyId);
      return NextResponse.json({ error: 'Erreur création compte: ' + (authError?.message || 'inconnue') }, { status: 400 });
    }
    uid = authData.user.id;

    // 3. Upsert public.users
    await admin.from('users').upsert({
      id:         uid,
      email,
      full_name,
      role:       'admin',
      company_id: companyId,
      is_active:  false,
    });

    // Force update au cas où le trigger aurait écrasé
    await admin.from('users').update({
      role:       'admin',
      company_id: companyId,
      is_active:  false,
    }).eq('id', uid);

    // 4. Notifier super admin
    const RESEND_KEY  = process.env.RESEND_API_KEY;
    const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
    if (RESEND_KEY && ADMIN_EMAIL) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to:      ADMIN_EMAIL,
          subject: `🆕 Nouvelle demande — ${company_name}`,
          html: `<div style="font-family:sans-serif;padding:32px">
            <h2>Nouvelle demande d'inscription</h2>
            <p><b>Entreprise:</b> ${company_name}</p>
            <p><b>Responsable:</b> ${full_name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Modules:</b> ${(modules||[]).join(', ')}</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/super-admin/companies"
               style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
              Valider sur Nexora →
            </a>
          </div>`,
        }),
      }).catch(() => {});
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
