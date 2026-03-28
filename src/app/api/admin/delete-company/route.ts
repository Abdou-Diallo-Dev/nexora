import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { companyId } = await request.json();
    if (!companyId) return NextResponse.json({ error: 'companyId requis' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. Récupérer tous les users de cette company
    const { data: users } = await adminClient
      .from('users').select('id').eq('company_id', companyId);

    // 2. Supprimer chaque user dans auth.users
    if (users && users.length > 0) {
      for (const u of users) {
        await adminClient.auth.admin.deleteUser(u.id);
      }
    }

    // 3. Supprimer les donnees liees (ordre FK)
    const del = (table: string) =>
      adminClient.from(table as any).delete().eq('company_id', companyId);

    // Tables optionnelles (peuvent ne pas exister selon le plan)
    await del('subscriptions');
    await del('logistics_invoice_items');
    await del('logistics_invoices');
    await del('supplier_order_items');
    await del('supplier_orders');
    await del('deliveries');
    await del('logistics_clients');
    await del('vehicles');
    await del('drivers');
    // Tables immobilier
    await del('rent_payments');
    await del('maintenance_tickets');
    await del('leases');
    await del('tenants');
    await del('properties');
    await del('users');

    // 4. Supprimer la company
    const { error } = await adminClient.from('companies').delete().eq('id', companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
