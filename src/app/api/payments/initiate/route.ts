import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

function generateReference(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 9000 + 1000);
}

export async function POST(req: NextRequest) {
  try {
    const { provider, amount, tenant_name, tenant_phone, tenant_email, description, company_id, payment_id } = await req.json();

    if (!provider || !amount) {
      return NextResponse.json({ error: 'provider and amount required' }, { status: 400 });
    }

    const reference = generateReference('PAY');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let payment_url = '';

    // ── CINETPAY ──────────────────────────────────────────────
    if (provider === 'cinetpay') {
      const apiKey = process.env.CINETPAY_API_KEY;
      const siteId = process.env.CINETPAY_SITE_ID;

      if (!apiKey || !siteId) {
        // Sandbox fallback pour les tests
        payment_url = `https://sandbox-apiserver.cinetpay.com/v2/payment?apikey=demo&site_id=demo&transaction_id=${reference}&amount=${amount}&currency=XOF&description=${encodeURIComponent(description || 'Loyer')}&return_url=${appUrl}/real-estate/payments`;
      } else {
        const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apikey: apiKey,
            site_id: siteId,
            transaction_id: reference,
            amount: amount,
            currency: 'XOF',
            description: description || 'Paiement loyer',
            return_url: appUrl + '/real-estate/payments?status=success',
            notify_url: appUrl + '/api/payments/webhook/cinetpay',
            customer_name: tenant_name || '',
            customer_phone_number: tenant_phone || '',
            customer_email: tenant_email || '',
            // Pass payment_id so webhook can update rent_payment
            metadata: payment_id || '',
          }),
        });
        if (res.ok) {
          const d = await res.json();
          payment_url = d.data?.payment_url || '';
        }
      }

    // ── WAVE ──────────────────────────────────────────────────
    } else if (provider === 'wave') {
      const key = process.env.WAVE_API_KEY;
      if (!key) {
        return NextResponse.json({ error: 'Wave non configure — ajoutez WAVE_API_KEY dans .env.local' }, { status: 503 });
      }
      const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: String(amount),
          currency: 'XOF',
          client_reference: payment_id || reference,
          success_url: appUrl + '/real-estate/payments?status=success',
          error_url: appUrl + '/real-estate/payments?status=error',
        }),
      });
      if (res.ok) {
        const d = await res.json();
        payment_url = d.wave_launch_url || d.checkout_url || '';
      } else {
        return NextResponse.json({ error: 'Wave initiation failed' }, { status: 500 });
      }

    // ── ORANGE MONEY ──────────────────────────────────────────
    } else if (provider === 'orange_money') {
      const clientId = process.env.ORANGE_MONEY_CLIENT_ID;
      const secret = process.env.ORANGE_MONEY_SECRET;
      if (!clientId || !secret) {
        return NextResponse.json({ error: 'Orange Money non configure — ajoutez les cles dans .env.local' }, { status: 503 });
      }
      const tokenRes = await fetch('https://api.orange.com/oauth/v3/token', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      if (!tokenRes.ok) return NextResponse.json({ error: 'Orange Money auth failed' }, { status: 500 });
      const { access_token } = await tokenRes.json();
      const payRes = await fetch('https://api.orange.com/orange-money-webpay/sn/v1/webpayment', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_key: clientId, currency: 'XOF', order_id: reference,
          amount, return_url: appUrl + '/real-estate/payments',
          cancel_url: appUrl + '/real-estate/payments',
          notif_url: appUrl + '/api/payments/webhook/orange',
          lang: 'fr', reference,
        }),
      });
      if (payRes.ok) { const d = await payRes.json(); payment_url = d.payment_url || ''; }
      else return NextResponse.json({ error: 'Orange Money initiation failed' }, { status: 500 });
    }

    // ── LOG EN BASE ───────────────────────────────────────────
    try {
      const sb = createServerSupabase();
      await sb.from('online_transactions').insert({
        company_id,
        payment_id: payment_id || null,
        reference,
        amount,
        provider,
        status: 'pending',
        tenant_name,
        tenant_phone,
        payment_url: payment_url || null,
      } as never);
    } catch (e) {
      console.error('Failed to log transaction:', e);
    }

    return NextResponse.json({ success: true, reference, payment_url });

  } catch (err) {
    console.error('Initiate payment error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}