import { NextResponse } from 'next/server';
import { OTP_STORE } from '@/lib/otp-store';

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

    entry.attempts += 1;
    if (entry.attempts > 5) {
      OTP_STORE.delete(email);
      return NextResponse.json({ error: 'Trop de tentatives. Demandez un nouveau code.' }, { status: 429 });
    }
    if (entry.code !== code.trim()) {
      return NextResponse.json({
        error: `Code incorrect. ${5 - entry.attempts} tentative(s) restante(s).`
      }, { status: 400 });
    }

    OTP_STORE.delete(email);
    return NextResponse.json({ success: true, verified: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}