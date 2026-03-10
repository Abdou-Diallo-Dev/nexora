import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { channel, recipient, subject, body, company_id } = await req.json();

    if (!recipient || !body) {
      return NextResponse.json({ error: 'recipient and body are required' }, { status: 400 });
    }

    if (channel === 'email') {
      const apiKey = process.env.SENDGRID_API_KEY || process.env.MAILGUN_API_KEY;
      if (!apiKey) return NextResponse.json({ error: 'Email API key not configured' }, { status: 503 });

      if (process.env.SENDGRID_API_KEY) {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + process.env.SENDGRID_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipient }] }],
            from: { email: process.env.FROM_EMAIL || 'noreply@immogest.pro' },
            subject: subject || 'Notification ImmoGest Pro',
            content: [{ type: 'text/plain', value: body }],
          }),
        });
        if (!res.ok) return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    } else if (channel === 'sms') {
      const atKey = process.env.AFRICAS_TALKING_API_KEY;
      const atUser = process.env.AFRICAS_TALKING_USERNAME;
      if (!atKey || !atUser) return NextResponse.json({ error: 'SMS not configured' }, { status: 503 });

      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: { apiKey: atKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: atUser, to: recipient, message: body }),
      });
      if (!res.ok) return NextResponse.json({ error: 'SMS send failed' }, { status: 500 });
    } else if (channel === 'whatsapp') {
      const token = process.env.WHATSAPP_API_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_ID;
      if (!token || !phoneId) return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 });

      const res = await fetch('https://graph.facebook.com/v18.0/' + phoneId + '/messages', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body } }),
      });
      if (!res.ok) return NextResponse.json({ error: 'WhatsApp send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
