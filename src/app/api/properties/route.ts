import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { propertySchema } from '@/lib/validations';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!userData?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 });

  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const offset = (page - 1) * pageSize;

  let query = supabase.from('properties').select('*', { count: 'exact' })
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) query = query.eq('status', status);
  if (search) query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, pageSize });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = propertySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!userData?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 });

  const { data, error } = await supabase.from('properties').insert({
    ...parsed.data, company_id: userData.company_id, created_by: user.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: userData.company_id, user_id: user.id,
    action: 'create', entity_type: 'property', entity_id: data.id, new_values: data,
  });

  return NextResponse.json(data, { status: 201 });
}
