'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { LoadingSpinner, inputCls, labelCls, btnPrimary } from '@/components/ui';

export default function TenantRegisterPage() {
  const [form, setForm] = useState({ full_name:'', email:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Mot de passe minimum 6 caracteres'); return; }
    setLoading(true);
    try {
      const { data, error } = await createClient().auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name },
          emailRedirectTo: window.location.origin + '/auth/login',
        },
      });
      if (error) { toast.error(error.message); return; }

      // Force correct role — trigger sets 'admin' by default, we override it
      if (data.user) {
        // Step 1: upsert profile
        await createClient().from('users').upsert({
          id: data.user.id,
          email: form.email,
          full_name: form.full_name,
          role: 'tenant',
          is_active: false,
        } as never);
        // Step 2: force update to override trigger default role
        await createClient().from('users').update({
          role: 'tenant',
          is_active: false,
          full_name: form.full_name,
        } as never).eq('id', data.user.id);
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-green-600"/>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Demande envoyee !</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Votre compte est en attente de validation par votre gestionnaire. 
            Vous recevrez un email une fois votre compte active.
          </p>
          <Link href="/auth/login" className="text-primary hover:underline text-sm font-medium">
            Retour a la connexion
          </Link>
        </div>
      </div>
    );
  }

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
            <p className="text-xs text-muted-foreground -mt-0.5">Espace Locataire</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-8 shadow-xl">
          <h1 className="text-xl font-bold text-foreground mb-1">Creer mon compte</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Acces a votre espace locataire
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nom complet</label>
              <input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))}
                required placeholder="Prenom Nom" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                required placeholder="vous@exemple.com" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Mot de passe</label>
              <div className="relative">
                <input type={showPw?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  required placeholder="Minimum 6 caracteres" className={inputCls+' pr-10'}/>
                <button type="button" onClick={()=>setShowPw(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className={btnPrimary+' w-full justify-center'}>
              {loading ? <LoadingSpinner size={16}/> : 'Creer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Deja un compte ?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}