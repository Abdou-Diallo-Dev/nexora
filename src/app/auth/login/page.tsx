'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Zap, Loader2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

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

    // 1. Authentification Supabase
    const { data, error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError('Email ou mot de passe incorrect');
      setLoading(false);
      return;
    }

    // 2. Vérifier is_active dans public.users
    let { data: userRow, error: userError } = await sb
      .from('users')
      .select('id, email, full_name, role, company_id, is_active')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!userRow) {
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

    // ── BLOCAGE : compte en attente de validation ────────────
    if (!userRow.is_active) {
      await sb.auth.signOut();
      setError('');
      setLoading(false);
      // Afficher message clair selon le rôle
      if (userRow.role === 'admin') {
        setError('Votre compte est en attente de validation par notre équipe. Vous recevrez un email dès l\'activation.');
      } else {
        setError('Votre compte n\'est pas encore activé. Contactez votre administrateur.');
      }
      return;
    }

    // 3. Charger les données entreprise
    let company = null;
    if (userRow.company_id) {
      const { data: comp } = await sb
        .from('companies')
        .select('*')
        .eq('id', userRow.company_id)
        .maybeSingle();

      // Vérifier que l'entreprise est aussi active
      if (comp && !comp.is_active) {
        await sb.auth.signOut();
        setError('Votre entreprise n\'est pas encore activée. Contactez le support.');
        setLoading(false);
        return;
      }
      company = comp;
    }

    // 4. Stocker et rediriger
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
      if (modules.includes('real_estate')) {
        router.push('/real-estate');
      } else if (modules.includes('logistics')) {
        router.push('/logistics');
      } else {
        router.push('/real-estate');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-500/30">
            <Zap size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-white">Nexora</h1>
          <p className="text-slate-400 text-sm mt-1">Plateforme de gestion professionnelle</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-foreground mb-1">Connexion</h2>
          <p className="text-sm text-muted-foreground mb-6">Accédez à votre espace de gestion</p>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-5">
              <ShieldAlert size={18} className="text-red-500 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-12"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              {loading ? <><Loader2 size={16} className="animate-spin"/> Connexion...</> : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link href="/auth/register-company" className="text-primary font-semibold hover:underline">
                Créer une entreprise
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Nexora — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
