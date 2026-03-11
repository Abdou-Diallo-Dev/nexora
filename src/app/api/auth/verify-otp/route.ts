import { NextResponse } from 'next/server';

// Import du store partagé
// Note: en production utiliser Redis
const OTP_STORE = new Map<string, { code: string; expires: number; attempts: number }>();

// On réexporte pour que send-otp puisse l'utiliser
// En prod ce serait une table Supabase : otp_codes(email, code, expires_at, used)
export { OTP_STORE };

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email et code requis' }, { status: 400 });
    }

    const entry = OTP_STORE.get(email);

    if (!entry) {
      return NextResponse.json({ error: 'Aucun code envoyé pour cet email' }, { status: 400 });
    }

    if (Date.now() > entry.expires) {
      OTP_STORE.delete(email);
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 });
    }

    // Incrémenter les tentatives
    entry.attempts += 1;
    if (entry.attempts > 5) {
      OTP_STORE.delete(email);
      return NextResponse.json({ error: 'Trop de tentatives incorrectes.' }, { status: 429 });
    }

    if (entry.code !== code.trim()) {
      return NextResponse.json({
        error: `Code incorrect. ${5 - entry.attempts} tentative(s) restante(s).`
      }, { status: 400 });
    }

    // Code valide — on le supprime (usage unique)
    OTP_STORE.delete(email);
    return NextResponse.json({ success: true, verified: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}