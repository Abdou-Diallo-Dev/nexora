'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ShieldAlert, Building2, Truck, Factory } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setCompany } = useAuthStore();
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
        ? "Votre compte est en attente de validation. Vous recevrez un email a l'activation."
        : "Votre compte n'est pas encore active. Contactez votre administrateur.");
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
        setError("Votre filiale n'est pas encore activee. Contactez le support.");
        setLoading(false);
        return;
      }
      company = comp;
    }

    setUser(userRow as any);
    setCompany(company as any);

    const role = userRow.role;
    if (role === 'super_admin') {
      router.push('/super-admin/dashboard');
    } else if (role === 'tenant') {
      router.push('/tenant-portal/dashboard');
    } else if (role === 'comptable') {
      router.push('/real-estate/reports');
    } else {
      const modules = company?.modules || [];
      if (modules.includes('beton')) {
        router.push('/beton');
      } else if (modules.includes('real_estate')) {
        router.push('/real-estate');
      } else if (modules.includes('logistics')) {
        router.push('/logistics');
      } else {
        router.push('/real-estate');
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel gauche — branding SARPA */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1040 0%, #3d2d7d 50%, #2d1f6e 100%)' }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-10" style={{ background: '#faab2d' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full opacity-10" style={{ background: '#faab2d' }} />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 rounded-full opacity-5" style={{ background: '#ffffff' }} />

        <div className="relative z-10 max-w-lg text-center">
          {/* Logo SARPA */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #faab2d, #f59e0b)' }}>
              <span className="text-2xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-1px' }}>SG</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tight">SARPA GROUP</h1>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#faab2d' }}>SENEGAL</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Votre ERP Groupe,<br/>
            <span style={{ color: '#faab2d' }}>centralisé et intelligent</span>
          </h2>
          <p className="text-white/60 text-base mb-12">
            Pilotez l'ensemble de vos filiales depuis une plateforme unique. Données en temps réel, décisions éclairées.
          </p>

          {/* Filiales */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <Building2 size={20} />, name: 'Immobilier', desc: 'Biens & locataires' },
              { icon: <Factory size={20} />, name: 'Béton', desc: 'Production & stock' },
              { icon: <Truck size={20} />, name: 'Logistiques', desc: 'Flotte & livraisons' },
            ].map(f => (
              <div key={f.name} className="rounded-2xl p-4 text-center border border-white/10 backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 text-white"
                  style={{ background: 'rgba(250,171,45,0.2)' }}>
                  <span style={{ color: '#faab2d' }}>{f.icon}</span>
                </div>
                <p className="text-white font-bold text-sm">{f.name}</p>
                <p className="text-white/50 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-slate-950">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3d2d7d, #5b3ea8)' }}>
              <span className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>SG</span>
            </div>
            <div>
              <p className="font-black text-sm text-foreground">SARPA GROUP</p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">SENEGAL</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Connexion</h2>
          <p className="text-sm text-muted-foreground mb-7">Accédez à votre espace SARPA GROUP</p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-5">
              <ShieldAlert size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ ['--tw-ring-color' as any]: '#3d2d7d' }}
                placeholder="votre@sarpagroup.sn"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#3d2d7d' }}>
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg mt-2"
              style={{ background: loading ? '#5b3ea8' : 'linear-gradient(135deg, #3d2d7d, #5b3ea8)', boxShadow: '0 8px 24px rgba(61,45,125,0.35)' }}>
              {loading ? <><Loader2 size={16} className="animate-spin"/> Connexion en cours...</> : 'Se connecter'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} SARPA GROUP SENEGAL — Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
