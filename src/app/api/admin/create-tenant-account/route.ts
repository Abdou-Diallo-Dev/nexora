import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(request: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { tenant_id, email, first_name, last_name, company_id } = await request.json();
    if (!tenant_id || !email || !company_id) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Vérifier si compte déjà existant
    const { data: existing } = await admin
      .from('tenant_accounts')
      .select('id')
      .eq('tenant_id', tenant_id)
      .maybeSingle();
    if (existing) return NextResponse.json({ success: true, already_exists: true });

    const password = generatePassword();
    const full_name = `${first_name} ${last_name}`;

    // Créer compte auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'tenant', is_active: true },
    });

    if (authError) {
      if (authError.message.includes('already')) {
        return NextResponse.json({ success: true, already_exists: true });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const uid = authData.user.id;

    // Créer dans public.users
    await admin.from('users').upsert({
      id: uid, email, full_name, role: 'tenant', company_id, is_active: true,
    });

    // Lier tenant_account
    await admin.from('tenant_accounts').insert({
      user_id: uid, tenant_id, company_id,
    });

    // Envoyer email avec identifiants
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to: email,
          subject: '🏠 Votre espace locataire Nexora',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                <h1 style="color:white;font-size:24px;margin:0">⚡ Nexora</h1>
              </div>
              <h2 style="color:#0f172a">Bonjour ${first_name} 👋</h2>
              <p style="color:#64748b">Votre compte locataire a été créé.</p>
              <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:24px 0">
                <p style="margin:0 0 8px;color:#64748b;font-size:14px">Vos identifiants :</p>
                <p style="margin:4px 0"><strong>Email :</strong> ${email}</p>
                <p style="margin:4px 0"><strong>Mot de passe :</strong> <code style="background:#e2e8f0;padding:2px 8px;border-radius:4px">${password}</code></p>
              </div>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login"
                style="display:block;background:#1e40af;color:white;padding:14px;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
                Accéder à mon espace →
              </a>
            </div>
          `,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ 
      success: true, 
      temp_password: !RESEND_KEY ? password : undefined 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}