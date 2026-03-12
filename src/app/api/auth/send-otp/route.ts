import { NextResponse } from 'next/server';
import { OTP_STORE } from '@/lib/otp-store';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email: string, code: string, companyName: string): Promise<boolean> {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: `${code} — Code de vérification Nexora`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <div style="background:#1e40af;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <h1 style="color:white;font-size:24px;margin:0">⚡ Nexora</h1>
            </div>
            <h2 style="color:#0f172a">Vérification de votre email</h2>
            <p style="color:#64748b">Vous créez un compte pour <strong>${companyName}</strong>. Voici votre code :</p>
            <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#1e40af">${code}</span>
            </div>
            <p style="color:#94a3b8;font-size:13px">Ce code expire dans <strong>10 minutes</strong>.</p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[RESEND ERROR] status=${res.status} body=${errBody}`);
    }
    return res.ok;
  }
  // Pas de RESEND_API_KEY → retourner false pour que le front affiche le code
  return false;
}

async function notifySuperAdmin(companyName: string, email: string, modules: string[]) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
  if (!RESEND_KEY || !ADMIN_EMAIL) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: ADMIN_EMAIL,
      subject: `🆕 Nouvelle demande — ${companyName}`,
      html: `<p>Nouvelle inscription: <b>${companyName}</b> (${email}) — Modules: ${modules.join(', ')}</p>
             <a href="${process.env.NEXT_PUBLIC_APP_URL}/super-admin/companies">Valider →</a>`,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const { email, company_name, modules } = await request.json();
    if (!email || !company_name) {
      return NextResponse.json({ error: 'Email et nom entreprise requis' }, { status: 400 });
    }

    const existing = OTP_STORE.get(email);
    if (existing && existing.expires > Date.now() && existing.attempts >= 3) {
      return NextResponse.json({ error: 'Trop de tentatives. Attendez 10 minutes.' }, { status: 429 });
    }

    const code = generateOTP();
    OTP_STORE.set(email, { code, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });

    const emailSent = await sendOTPEmail(email, code, company_name);
    notifySuperAdmin(company_name, email, modules || []).catch(console.error);

    // Si pas de RESEND configuré, on renvoie le code dans la réponse pour dev/test
    if (!emailSent) {
      console.log(`[OTP DEV] ${email} → ${code}`);
      return NextResponse.json({ success: true, dev_code: code });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}