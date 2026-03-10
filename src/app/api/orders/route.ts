import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { orderSchema } from '@/lib/validations';

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
  const offset = (page - 1) * pageSize;

  let query = supabase.from('orders')
    .select('*, clients(first_name, last_name, company_name), order_items(*)', { count: 'exact' })
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, pageSize });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { items, ...orderData } = body;
  const parsed = orderSchema.safeParse(orderData);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
  if (!userData?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 });

  const totalAmount = (items || []).reduce((s: number, i: { quantity: number; unit_price: number }) => s + i.quantity * i.unit_price, 0);

  const { data: order, error } = await supabase.from('orders').insert({
    ...parsed.data, company_id: userData.company_id, created_by: user.id, total_amount: totalAmount,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (items?.length > 0) {
    await supabase.from('order_items').insert(items.map((item: Record<string, unknown>) => ({ ...item, order_id: order.id })));
  }

  return NextResponse.json(order, { status: 201 });
}
