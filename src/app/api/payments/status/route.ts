import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  if (!reference) return NextResponse.json({ error: 'reference required' }, { status: 400 });

  const sb = createServerSupabase();
  const { data } = await sb.from('online_transactions').select('*').eq('reference', reference).maybeSingle();
  return NextResponse.json({ transaction: data });
}