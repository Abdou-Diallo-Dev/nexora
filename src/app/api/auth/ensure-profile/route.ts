import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/store';

const ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'agent',
  'viewer',
  'comptable',
  'pdg',
  'responsable_operations',
  'tenant',
];

export async function POST() {
  try {
    const server = createServerSupabase();
    const { data: auth } = await server.auth.getUser();
    const authUser = auth.user;

    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('users')
      .select('id, email, full_name, role, company_id, is_active, created_at, updated_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, user: existing, repaired: false });
    }

    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
    const role = typeof meta.role === 'string' ? meta.role as UserRole : undefined;
    const company_id = typeof meta.company_id === 'string' ? meta.company_id : null;
    const full_name =
      typeof meta.full_name === 'string' && meta.full_name.trim()
        ? meta.full_name.trim()
        : authUser.email?.split('@')[0] || 'Utilisateur';

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Profil incomplet' }, { status: 409 });
    }

    if (role !== 'super_admin' && role !== 'tenant' && !company_id) {
      return NextResponse.json({ error: 'Entreprise manquante' }, { status: 409 });
    }

    const { error: upsertError } = await admin.from('users').upsert({
      id: authUser.id,
      email: authUser.email || '',
      full_name,
      role,
      company_id,
      is_active: true,
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    const { data: repairedUser, error: selectError } = await admin
      .from('users')
      .select('id, email, full_name, role, company_id, is_active, created_at, updated_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (selectError || !repairedUser) {
      return NextResponse.json({ error: 'Profil toujours introuvable' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: repairedUser, repaired: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
