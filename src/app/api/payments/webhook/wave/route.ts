import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('wave-signature') || '';
    const secret = process.env.WAVE_SECRET_KEY || '';

    // Verify Wave signature
    if (secret) {
      const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
      if (signature !== expected) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const event = JSON.parse(body);
    const sb = createServerSupabase();

    if (event.type === 'checkout.session.completed') {
      const { client_reference, id: sessionId } = event.data;
      // Update transaction
      await sb.from('online_transactions')
        .update({ status: 'success', updated_at: new Date().toISOString() } as never)
        .eq('reference', client_reference);
      // Update rent payment
      await sb.from('rent_payments')
        .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0], payment_method: 'wave' } as never)
        .eq('id', client_reference);
    }

    return NextResponse.json({ message: 'OK' });
  } catch (err) {
    console.error('Wave webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}