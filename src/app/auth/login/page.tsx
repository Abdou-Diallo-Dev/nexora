'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { LoadingSpinner, inputCls, labelCls, btnPrimary } from '@/components/ui';

function getRedirectPath(role: string, modules: string[]): string {
  switch (role) {
    case 'super_admin': return '/super-admin/dashboard';
    case 'tenant':      return '/tenant-portal/dashboard';
    case 'comptable':
      if (modules?.includes('real_estate')) return '/real-estate/reports';
      if (modules?.includes('logistics'))   return '/logistics';
      return '/real-estate/reports';
    case 'admin':
    case 'manager':
    case 'agent':
    case 'viewer':
    default:
      if (modules?.includes('real_estate')) return '/real-estate';
      if (modules?.includes('logistics'))   return '/logistics';
      return '/real-estate';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser, setCompany } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); return; }

      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const { data: userData } = await sb.from('users')
        .select('*, companies(*)')
        .eq('id', user.id)
        .maybeSingle();

      if (userData) {
        setUser(userData as never);
        if (userData.companies) setCompany(userData.companies as never);

        // Check if account is active
        if (!userData.is_active && userData.role !== 'super_admin') {
          await createClient().auth.signOut();
          toast.error('Votre compte est en attente de validation. Veuillez patienter.');
          return;
        }

        // Redirect based on role
        const redirect = getRedirectPath(userData.role, userData.companies?.modules || []);
        router.push(redirect);
      } else {
        router.push('/real-estate');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Zap size={22} className="text-white"/>
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">Nexora</span>
            <p className="text-xs text-muted-foreground -mt-0.5">Plateforme de gestion</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-8 shadow-xl">
          <h1 className="text-xl font-bold text-foreground mb-1">Connexion</h1>
          <p className="text-sm text-muted-foreground mb-6">Accedez a votre espace de travail</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Adresse email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                required placeholder="vous@exemple.com" className={inputCls} autoComplete="email"/>
            </div>
            <div>
              <label className={labelCls}>Mot de passe</label>
              <div className="relative">
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  required placeholder="••••••••" className={inputCls+' pr-10'} autoComplete="current-password"/>
                <button type="button" onClick={()=>setShowPw(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                Mot de passe oublie ?
              </Link>
            </div>
            <button type="submit" disabled={loading} className={btnPrimary+' w-full justify-center'}>
              {loading ? <LoadingSpinner size={16}/> : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 space-y-2 border-t border-border pt-5">
            <p className="text-center text-sm text-muted-foreground">
              Vous etes locataire ?{' '}
              <Link href="/auth/register-tenant" className="text-primary hover:underline font-medium">Espace locataire</Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Nouvelle entreprise ?{' '}
              <Link href="/auth/register-company" className="text-primary hover:underline font-medium">Creer mon entreprise</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}