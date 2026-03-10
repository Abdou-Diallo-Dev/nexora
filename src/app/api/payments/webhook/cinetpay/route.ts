import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cpm_trans_id, cpm_site_id, cpm_trans_status, cpm_amount, cpm_custom } = body;

    // Verify site_id matches ours
    const siteId = process.env.CINETPAY_SITE_ID;
    if (siteId && cpm_site_id !== siteId) {
      return NextResponse.json({ error: 'Invalid site_id' }, { status: 403 });
    }

    const sb = createServerSupabase();

    // Update online_transactions
    await sb.from('online_transactions')
      .update({ status: cpm_trans_status === 'ACCEPTED' ? 'success' : 'failed', updated_at: new Date().toISOString() } as never)
      .eq('reference', cpm_trans_id);

    // If payment accepted, update rent_payment status
    if (cpm_trans_status === 'ACCEPTED' && cpm_custom) {
      await sb.from('rent_payments')
        .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0], payment_method: 'cinetpay' } as never)
        .eq('id', cpm_custom);
    }

    return NextResponse.json({ message: 'OK' });
  } catch (err) {
    console.error('CinetPay webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// CinetPay also sends GET for verification
export async function GET() {
  return NextResponse.json({ message: 'CinetPay webhook endpoint active' });
}