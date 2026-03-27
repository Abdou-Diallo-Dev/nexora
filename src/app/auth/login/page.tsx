'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ShieldAlert, Building2, Truck, Factory } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';

const SARPA_PURPLE = '#3d2674';
const SARPA_YELLOW = '#faab2d';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setCompany, setLoading: setAuthLoading } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const sb = createClient();
    const { data, error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError('Email ou mot de passe incorrect');
      setLoading(false);
      return;
    }

    let { data: userRow, error: userError } = await sb
      .from('users')
      .select('id, email, full_name, role, company_id, is_active')
      .eq('id', data.user.id)
      .maybeSingle();

    const metadataRole = typeof data.user.user_metadata?.role === 'string' ? data.user.user_metadata.role : null;
    const metadataCompanyId =
      typeof data.user.user_metadata?.company_id === 'string' && data.user.user_metadata.company_id.trim()
        ? data.user.user_metadata.company_id
        : null;
    const needsRepair =
      !userRow ||
      (metadataRole && userRow.role !== metadataRole) ||
      (metadataCompanyId && userRow.company_id !== metadataCompanyId) ||
      (!userRow?.full_name?.trim());

    if (needsRepair) {
      try {
        const repairRes = await fetch('/api/auth/ensure-profile', { method: 'POST' });
        const repairJson = await repairRes.json();
        if (repairRes.ok && repairJson.user) {
          userRow = repairJson.user;
          userError = null;
        }
      } catch {}
    }

    if (userError || !userRow) {
      await sb.auth.signOut();
      setError('Compte introuvable. Contactez le support.');
      setLoading(false);
      return;
    }

    if (!userRow.is_active) {
      await sb.auth.signOut();
      setError(userRow.role === 'admin'
        ? "Votre compte est en attente de validation. Vous recevrez un email à l'activation."
        : "Votre compte n'est pas encore activé. Contactez votre administrateur.");
      setLoading(false);
      return;
    }

    let company = null;
    if (userRow.company_id) {
      const { data: comp } = await sb
        .from('companies')
        .select('*')
        .eq('id', userRow.company_id)
        .maybeSingle();
      if (comp && !comp.is_active) {
        await sb.auth.signOut();
        setError("Votre filiale n'est pas encore activée. Contactez le support.");
        setLoading(false);
        return;
      }
      company = comp;
    }

    setUser(userRow as any);
    setCompany(company as any);
    setAuthLoading(false);

    const role = userRow.role;
    const modules = company?.modules || [];

    // ── Rôles spéciaux ─────────────────────────────────────────
    if (role === 'super_admin') {
      router.push('/super-admin/dashboard');
    } else if (role === 'tenant') {
      router.push('/tenant-portal/dashboard');

    // ── Direction SARPA GROUP → dashboard global ou premier module dispo ──
    } else if (['pdg','directeur_operations','directeur_financier','directeur_juridique','coordinatrice'].includes(role)) {
      // Les rôles direction voient tous les modules — on les envoie vers le premier disponible
      if (modules.includes('real_estate')) router.push('/real-estate');
      else if (modules.includes('logistics')) router.push('/logistics');
      else if (modules.includes('beton')) router.push('/beton');
      else router.push('/real-estate');

    // ── Rôles spécifiques Logistique ───────────────────────────
    } else if (['manager_logistique','caissiere','responsable_vente','assistante_admin'].includes(role)) {
      router.push('/logistics');

    // ── Rôles spécifiques Béton ────────────────────────────────
    } else if (['manager_beton','responsable_production','operateur_centrale','assistante_commerciale','responsable_qualite'].includes(role)) {
      router.push('/beton');

    // ── Rôles Immobilier spécialisés ───────────────────────────
    } else if (role === 'comptable') {
      router.push('/real-estate/reports');
    } else if (['responsable_operations'].includes(role)) {
      router.push('/real-estate/analytics');

    // ── Tous les autres (admin, manager, agent, viewer) ────────
    } else {
      if (modules.includes('real_estate')) router.push('/real-estate');
      else if (modules.includes('logistics')) router.push('/logistics');
      else if (modules.includes('beton')) router.push('/beton');
      else router.push('/real-estate');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: `linear-gradient(160deg, #1a0f3d 0%, ${SARPA_PURPLE} 45%, #2e1a5e 100%)` }}
    >
      {/* Éléments décoratifs de fond */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] right-[-120px] w-[480px] h-[480px] rounded-full opacity-[0.07]" style={{ background: SARPA_YELLOW }} />
        <div className="absolute bottom-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full opacity-[0.06]" style={{ background: SARPA_YELLOW }} />
        <div className="absolute top-1/3 left-[-60px] w-[200px] h-[200px] rounded-full opacity-[0.04]" style={{ background: '#ffffff' }} />
        <div className="absolute bottom-1/3 right-[-40px] w-[160px] h-[160px] rounded-full opacity-[0.04]" style={{ background: '#ffffff' }} />
        {/* Grille subtile */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }} />
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 py-10">

        {/* ── Logo SARPA GROUP ── */}
        <div className="flex flex-col items-center mb-10">
          {/* Icône SG — fidèle au logo */}
          <div className="relative mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
            >
              {/* S jaune + G blanc superposés */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <span
                  className="absolute text-4xl font-black leading-none"
                  style={{ color: SARPA_YELLOW, fontFamily: 'Georgia, serif', left: '0px', top: '-2px', letterSpacing: '-2px' }}
                >S</span>
                <span
                  className="absolute text-4xl font-black leading-none"
                  style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Georgia, serif', right: '0px', bottom: '-2px', letterSpacing: '-2px' }}
                >G</span>
              </div>
            </div>
            {/* Halo jaune */}
            <div className="absolute inset-0 rounded-full opacity-20 blur-xl" style={{ background: SARPA_YELLOW }} />
          </div>

          {/* SARPA GROUP SENEGAL */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-3xl font-black text-white tracking-tight">SARPA</span>
              <span className="text-3xl font-black tracking-tight" style={{ color: SARPA_YELLOW }}>GROUP</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs font-bold tracking-[0.25em] text-white/70 uppercase">SÉNÉGAL</span>
              {/* Drapeau sénégalais */}
              <div className="flex gap-0.5">
                <div className="w-3 h-2 rounded-sm" style={{ background: '#00853F' }} />
                <div className="w-3 h-2 rounded-sm" style={{ background: '#FDEF42' }} />
                <div className="w-3 h-2 rounded-sm" style={{ background: '#E31B23' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Filiales ── */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: <Building2 size={18} />, name: 'Immobilier', desc: 'Biens & locataires' },
            { icon: <Factory size={18} />,   name: 'Béton',       desc: 'Production & stock' },
            { icon: <Truck size={18} />,     name: 'Logistiques', desc: 'Flotte & livraisons' },
          ].map(f => (
            <div
              key={f.name}
              className="rounded-2xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ background: `rgba(250,171,45,0.18)` }}
              >
                <span style={{ color: SARPA_YELLOW }}>{f.icon}</span>
              </div>
              <p className="text-white font-bold text-xs">{f.name}</p>
              <p className="text-white/45 text-[10px] mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Formulaire de connexion ── */}
        <div
          className="rounded-3xl p-7"
          style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(16px)' }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-black text-white">Connexion</h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Accédez à votre espace SARPA GROUP
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <ShieldAlert size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#fca5a5' }} />
              <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.80)' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.20)',
                  color: '#ffffff',
                  caretColor: SARPA_YELLOW,
                }}
                placeholder="votre@sarpagroup.sn"
                onFocus={e => { e.target.style.borderColor = SARPA_YELLOW; e.target.style.boxShadow = `0 0 0 3px rgba(250,171,45,0.15)`; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.20)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.80)' }}>
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.20)',
                    color: '#ffffff',
                    caretColor: SARPA_YELLOW,
                  }}
                  placeholder="••••••••"
                  onFocus={e => { e.target.style.borderColor = SARPA_YELLOW; e.target.style.boxShadow = `0 0 0 3px rgba(250,171,45,0.15)`; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.20)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password"
                className="text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: SARPA_YELLOW }}>
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              style={{
                background: loading ? `${SARPA_YELLOW}cc` : SARPA_YELLOW,
                color: '#1a0f3d',
                boxShadow: `0 8px 28px rgba(250,171,45,0.35)`,
                letterSpacing: '0.03em',
              }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin"/> Connexion en cours...</>
                : 'Se connecter →'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] mt-6" style={{ color: 'rgba(255,255,255,0.28)' }}>
          © {new Date().getFullYear()} SARPA GROUP SÉNÉGAL — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
