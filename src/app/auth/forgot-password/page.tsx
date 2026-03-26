'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { inputCls } from '@/components/ui';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1a1040 0%, #3d2674 50%, #2d1f6e 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #faab2d, #f59e0b)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white">SARPA GROUP</span>
              <p className="text-xs font-semibold tracking-widest uppercase text-white/60">SENEGAL</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
          {!sent ? (
            <>
              <h1 className="text-xl font-bold text-foreground mb-1">Mot de passe oublié</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className={inputCls + ' pl-9'}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: '#3d2674' }}>
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Email envoyé !</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.
              </p>
              <button onClick={() => router.push('/auth/login')}
                className="w-full py-2.5 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-colors" style={{ background: '#3d2674' }}>
                Retour à la connexion
              </button>
            </div>
          )}

          <Link href="/auth/login" className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={12} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}