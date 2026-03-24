import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

    const adminClient = createAdminClient();

    // 1. Supprimer dans public.users
    const { error: dbError } = await adminClient.from('users').delete().eq('id', userId);
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    // 2. Supprimer dans auth.users
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
