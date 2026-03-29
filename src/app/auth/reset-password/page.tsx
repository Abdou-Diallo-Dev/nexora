'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { inputCls } from '@/components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Minimum 8 caractères'); return; }
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    setTimeout(() => router.push('/auth/login'), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #1e3a8a 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #93c5fd, #60a5fa)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">Nexora</span>
              <p className="text-xs font-semibold tracking-widest uppercase text-white/60">SENEGAL</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
          {!done ? (
            <>
              <h1 className="text-xl font-bold text-foreground mb-1">Nouveau mot de passe</h1>
              <p className="text-sm text-muted-foreground mb-6">Choisissez un mot de passe sécurisé.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPwd ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères"
                      className={inputCls + ' pl-9 pr-9'} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Confirmer</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPwd ? 'text' : 'password'} required value={confirm}
                      onChange={e => setConfirm(e.target.value)} placeholder="Répétez le mot de passe"
                      className={inputCls + ' pl-9'} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-60" style={{ background: 'hsl(var(--primary))' }}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Mot de passe modifié !</h2>
              <p className="text-sm text-muted-foreground">Redirection vers la connexion...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}