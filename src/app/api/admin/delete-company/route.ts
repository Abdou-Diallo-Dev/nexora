import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { companyId } = await request.json();
    if (!companyId) return NextResponse.json({ error: 'companyId requis' }, { status: 400 });

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Récupérer tous les users de cette company
    const { data: users } = await adminClient
      .from('users').select('id').eq('company_id', companyId);

    // 2. Supprimer chaque user dans auth.users
    if (users && users.length > 0) {
      for (const u of users) {
        await adminClient.auth.admin.deleteUser(u.id);
      }
    }

    // 3. Supprimer les données liées
    await adminClient.from('rent_payments').delete().eq('company_id', companyId);
    await adminClient.from('maintenance_tickets').delete().eq('company_id', companyId);
    await adminClient.from('leases').delete().eq('company_id', companyId);
    await adminClient.from('tenants').delete().eq('company_id', companyId);
    await adminClient.from('properties').delete().eq('company_id', companyId);
    await adminClient.from('users').delete().eq('company_id', companyId);

    // 4. Supprimer la company
    const { error } = await adminClient.from('companies').delete().eq('id', companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}