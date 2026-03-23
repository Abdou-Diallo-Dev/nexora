import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const emailHtml = (firstName: string, email: string, password: string, appUrl: string, companyName: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;padding:20px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center">
          <span style="color:white;font-size:18px">⚡</span>
        </div>
        <span style="color:white;font-size:22px;font-weight:800;letter-spacing:-0.5px">Nexora</span>
      </div>
      <h1 style="color:white;font-size:28px;font-weight:700;margin:16px 0 4px">Bienvenue 👋</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0">Votre espace locataire est prêt</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
      <p style="color:#1e293b;font-size:16px;margin:0 0 8px"><strong>Bonjour ${firstName},</strong></p>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px">
        <strong style="color:#1e293b">${companyName}</strong> vous a créé un espace personnel sécurisé sur Nexora.
        Vous pouvez y consulter vos paiements, quittances, contrat de bail et contacter votre gestionnaire.
      </p>

      <!-- Credentials box -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#64748b;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 14px">Vos identifiants de connexion</p>

        <div style="margin-bottom:12px">
          <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px">Adresse email</p>
          <p style="color:#1e293b;font-size:15px;font-weight:600;margin:0;background:#fff;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0">${email}</p>
        </div>

        <div>
          <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px">Mot de passe temporaire</p>
          <p style="color:#1e40af;font-size:18px;font-weight:700;letter-spacing:2px;margin:0;background:#eff6ff;padding:10px 14px;border-radius:8px;border:1px solid #bfdbfe;font-family:monospace">${password}</p>
        </div>
      </div>

      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:24px">
        <p style="color:#92400e;font-size:13px;margin:0">
          🔒 <strong>Important :</strong> Changez votre mot de passe dès votre première connexion depuis la section <em>Mon profil</em>.
        </p>
      </div>

      <!-- CTA -->
      <a href="${appUrl}/auth/login"
        style="display:block;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:white;padding:16px;text-align:center;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:20px">
        Accéder à mon espace locataire →
      </a>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0">
        Ou copiez ce lien : <span style="color:#1e40af">${appUrl}/auth/login</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px;text-align:center">
      <p style="color:#94a3b8;font-size:12px;margin:0">
        Ce message a été envoyé par <strong>${companyName}</strong> via Nexora.<br>
        Si vous n'attendiez pas ce message, ignorez cet email.
      </p>
    </div>

  </div>
</body>
</html>
`;

export async function POST(request: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { tenant_id, email, first_name, last_name, company_id, company_name } = await request.json();
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

    // Toujours utiliser le company_id du tenant (source de vérité)
    const { data: tenantRow } = await admin
      .from('tenants')
      .select('company_id')
      .eq('id', tenant_id)
      .maybeSingle();
    const real_company_id = tenantRow?.company_id || company_id;

    const password  = generatePassword();
    const full_name = `${first_name} ${last_name}`.trim();

    // Créer compte auth Supabase
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'tenant', is_active: true },
    });

    let uid: string;

    if (authError) {
      if (authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('exists')) {
        // User auth exists - find their uid and still link tenant_account
        const { data: existingUser } = await admin.auth.admin.listUsers();
        const found = existingUser?.users?.find((u: any) => u.email === email);
        if (!found) return NextResponse.json({ error: authError.message }, { status: 400 });
        uid = found.id;
        // Ensure public.users is correct
        await admin.from('users').upsert({
          id: uid, email, full_name, role: 'tenant', company_id: real_company_id, is_active: true,
        });
        // Link tenant_account if not already linked
        await admin.from('tenant_accounts').upsert({
          user_id: uid, tenant_id, company_id: real_company_id, email,
        }, { onConflict: 'tenant_id' });
        return NextResponse.json({ success: true, already_exists: true });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    uid = authData.user.id;

    // Créer dans public.users avec le vrai company_id
    await admin.from('users').upsert({
      id: uid, email, full_name, role: 'tenant', company_id: real_company_id, is_active: true,
    });

    // Lier tenant_account avec le vrai company_id
    await admin.from('tenant_accounts').insert({
      user_id: uid, tenant_id, company_id: real_company_id, email,
    });

    // Envoyer email de bienvenue
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://nexora-sage-nine.vercel.app';
    const displayCompany = company_name || 'Votre gestionnaire';

    if (RESEND_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to:      email,
          subject: `🏠 Bienvenue sur votre espace locataire — ${displayCompany}`,
          html:    emailHtml(first_name, email, password, appUrl, displayCompany),
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Resend error:', err);
      }
    }

    return NextResponse.json({
      success:       true,
      // Retourner le mot de passe si Resend non configuré
      temp_password: !RESEND_KEY ? password : undefined,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}