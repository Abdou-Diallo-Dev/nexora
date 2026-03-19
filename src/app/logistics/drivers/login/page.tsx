'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';
import { toast } from 'sonner';

export default function DriverLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const sb = createClient();
    const { data, error: authErr } = await sb.auth.signInWithPassword({ email, password });
    if (authErr || !data.user) {
      setError('Email ou mot de passe incorrect');
      setLoading(false); return;
    }
    // Verify this user is a driver
    const { data: driver } = await sb.from('drivers')
      .select('id,first_name,last_name,status')
      .eq('user_id', data.user.id).maybeSingle();
    if (!driver) {
      await sb.auth.signOut();
      setError('Accès refusé — compte chauffeur introuvable');
      setLoading(false); return;
    }
    router.replace('/driver/missions');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <span className="text-4xl">🚛</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Nexora Driver</h1>
        <p className="text-slate-400 text-sm mt-1">Application chauffeur</p>
      </div>

      {/* Form */}
      <form onSubmit={login} className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
            placeholder="votre@email.com" autoComplete="email"
            className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Mot de passe</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
            placeholder="••••••••" autoComplete="current-password"
            className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <><LoadingSpinner size={18}/>Connexion...</> : 'Se connecter'}
        </button>
      </form>

      <p className="mt-8 text-slate-600 text-xs">Nexora Logistique © 2026</p>
    </div>
  );
}