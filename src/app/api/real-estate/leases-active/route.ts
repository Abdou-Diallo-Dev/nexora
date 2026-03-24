import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  if (!companyId) return NextResponse.json({ error: 'company_id requis' }, { status: 400 });

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('leases')
    .select('id,status,start_date,end_date,rent_amount,deposit_amount,tenants(first_name,last_name,email,phone),properties(name,address,city)')
    .eq('company_id', companyId)
    .order('start_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
