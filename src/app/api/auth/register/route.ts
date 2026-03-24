import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAuthUserMetadata } from '@/lib/user-profiles';

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rollback(supabase: SupabaseClient<any>, userId: string | null, companyId: string | null) {
  if (userId) {
    try { await supabase.auth.admin.deleteUser(userId); } catch {}
  }
  if (companyId) {
    try { await supabase.from('companies').delete().eq('id', companyId); } catch {}
  }
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  let userId: string | null = null;
  let companyId: string | null = null;

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const full_name = String(body.full_name || '').trim();
    const company_name = String(body.company_name || '').trim();
    const modules = body.modules;

    if (!email || !password || !full_name || !company_name || !modules?.length) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    // 1. Créer l'utilisateur Auth
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: buildAuthUserMetadata({
        full_name,
        role: 'admin',
        company_id: null,
        is_active: true,
      }),
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('existe')) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erreur création du compte' }, { status: 500 });
    }

    userId = authData.user.id;

    // 2. Créer l'entreprise
    let slug = slugify(company_name);
    const { data: existing } = await supabase
      .from('companies')
      .select('slug')
      .ilike('slug', `${slug}%`);
    if (existing && existing.length > 0) slug = `${slug}-${Date.now()}`;

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: company_name,
        slug,
        email,
        modules,
        is_active: true,
        subscription_plan: 'basic',
      })
      .select()
      .single();

    if (companyError) {
      await rollback(supabase, userId, null);
      return NextResponse.json({ error: `Erreur entreprise : ${companyError.message}` }, { status: 500 });
    }

    companyId = company.id;

    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: buildAuthUserMetadata({
        full_name,
        role: 'admin',
        company_id: companyId,
        is_active: true,
      }),
    });

    // 3. Créer le profil utilisateur
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        full_name,
        company_id: companyId,
        role: 'admin',
        is_active: true,
      }, { onConflict: 'id' });

    if (userError) {
      await rollback(supabase, userId, companyId);
      return NextResponse.json({ error: `Erreur profil : ${userError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Compte créé avec succès' }, { status: 201 });

  } catch (err: unknown) {
    await rollback(supabase, userId, companyId);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
