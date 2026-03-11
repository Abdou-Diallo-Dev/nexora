import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Stockage temporaire OTP en mémoire (TTL 10 min)
// En production utiliser Redis ou une table DB
const OTP_STORE = new Map<string, { code: string; expires: number; attempts: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email: string, code: string, companyName: string) {
  // Utilise Supabase pour envoyer via leur SMTP intégré
  // OU Resend / Nodemailer si configuré
  // Pour l'instant on utilise l'API Supabase Auth pour envoyer un magic link avec l'OTP custom

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Envoyer via Resend si configuré, sinon log
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (RESEND_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'noreply@nexora.app',
        to: email,
        subject: `${code} — Code de vérification Nexora`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <h1 style="color:white;font-size:24px;margin:0">⚡ Nexora</h1>
            </div>
            <h2 style="color:#0f172a;font-size:20px">Vérification de votre email</h2>
            <p style="color:#64748b;font-size:15px">
              Bonjour,<br><br>
              Vous créez un compte pour l'entreprise <strong>${companyName}</strong>.<br>
              Voici votre code de vérification :
            </p>
            <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#1e40af">${code}</span>
            </div>
            <p style="color:#94a3b8;font-size:13px">
              Ce code expire dans <strong>10 minutes</strong>.<br>
              Si vous n'avez pas demandé ce code, ignorez cet email.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="color:#cbd5e1;font-size:11px;text-align:center">
              Nexora — Plateforme de gestion professionnelle
            </p>
          </div>
        `,
      }),
    });
    if (!res.ok) throw new Error('Erreur envoi email');
  } else {
    // Mode développement — log le code dans la console Vercel
    console.log(`[OTP DEV] Email: ${email} | Code: ${code} | Entreprise: ${companyName}`);
  }
}

async function notifySuperAdmin(companyName: string, email: string, modules: string[]) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
  if (!RESEND_KEY || !ADMIN_EMAIL) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'noreply@nexora.app',
      to: ADMIN_EMAIL,
      subject: `🆕 Nouvelle demande — ${companyName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;font-size:24px;margin:0">⚡ Nexora Admin</h1>
          </div>
          <h2 style="color:#0f172a">Nouvelle demande d'inscription</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:10px;background:#f8fafc;font-weight:bold;color:#64748b;width:40%">Entreprise</td><td style="padding:10px;color:#0f172a">${companyName}</td></tr>
            <tr><td style="padding:10px;background:#f1f5f9;font-weight:bold;color:#64748b">Email admin</td><td style="padding:10px;color:#0f172a">${email}</td></tr>
            <tr><td style="padding:10px;background:#f8fafc;font-weight:bold;color:#64748b">Modules</td><td style="padding:10px;color:#0f172a">${modules.join(', ')}</td></tr>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/super-admin/companies" 
             style="display:block;background:#1e40af;color:white;padding:14px;text-align:center;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:20px">
            Valider sur Nexora →
          </a>
        </div>
      `,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const { email, company_name, modules } = await request.json();
    if (!email || !company_name) {
      return NextResponse.json({ error: 'Email et nom entreprise requis' }, { status: 400 });
    }

    // Vérifier pas trop d'essais (rate limit simple)
    const existing = OTP_STORE.get(email);
    if (existing && existing.expires > Date.now() && existing.attempts >= 3) {
      return NextResponse.json({ error: 'Trop de tentatives. Attendez 10 minutes.' }, { status: 429 });
    }

    const code = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min

    OTP_STORE.set(email, { code, expires, attempts: 0 });

    await sendOTPEmail(email, code, company_name);

    // Notifier le super admin en parallèle
    notifySuperAdmin(company_name, email, modules || []).catch(console.error);

    return NextResponse.json({ success: true, message: `Code envoyé à ${email}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Export pour verify-otp
export { OTP_STORE };