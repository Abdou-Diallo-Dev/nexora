import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 7);
}

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let uid: string | null = null;
  let companyId: string | null = null;

  try {
    const { email, password, full_name, company_name, company_email, company_phone, modules } = await request.json();

    // ── Validation basique ───────────────────────────────────
    if (!email || !password || !full_name || !company_name) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // ── Vérifier si email déjà utilisé (via public.users) ──────────────────────
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingUser) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
    }

    // ── ÉTAPE 1 : Créer l'entreprise EN PREMIER ──────────────
    const slug = generateSlug(company_name);
    const { data: company, error: compError } = await admin
      .from('companies')
      .insert({
        name: company_name,
        email: company_email || email,
        phone: company_phone || null,
        modules: modules || [],
        plan: 'free',
        is_active: false, // ← inactif jusqu'à validation super admin
        slug,
      })
      .select('id')
      .single();

    if (compError || !company) {
      return NextResponse.json(
        { error: 'Erreur création entreprise: ' + (compError?.message || 'inconnue') },
        { status: 400 }
      );
    }
    companyId = company.id;

    // ── ÉTAPE 2 : Créer le compte auth ───────────────────────
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true, // email confirmé mais compte inactif
    });

    if (authError || !authData?.user) {
      // Rollback entreprise
      await admin.from('companies').delete().eq('id', companyId);
      return NextResponse.json(
        { error: 'Erreur création compte: ' + (authError?.message || 'inconnue') },
        { status: 400 }
      );
    }
    uid = authData.user.id;

    // ── ÉTAPE 3 : Créer l'entrée dans public.users ───────────
    const { error: userError } = await admin.from('users').upsert({
      id: uid,
      email,
      full_name,
      role: 'admin',
      company_id: companyId,
      is_active: false, // ← bloqué jusqu'à validation
    });

    if (userError) {
      // Rollback complet
      await admin.auth.admin.deleteUser(uid);
      await admin.from('companies').delete().eq('id', companyId);
      return NextResponse.json(
        { error: 'Erreur création utilisateur: ' + userError.message },
        { status: 400 }
      );
    }

    // ── Succès : demande enregistrée, en attente de validation
    return NextResponse.json({
      success: true,
      message: 'Demande envoyée. Votre compte sera activé après validation par notre équipe.',
    });

  } catch (e: any) {
    // Rollback d'urgence si exception inattendue
    try {
      if (uid) await admin.auth.admin.deleteUser(uid);
      if (companyId && !uid) await admin.from('companies').delete().eq('id', companyId);
    } catch {}
    return NextResponse.json({ error: 'Erreur serveur: ' + e.message }, { status: 500 });
  }
}