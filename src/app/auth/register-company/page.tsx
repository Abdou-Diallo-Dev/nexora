'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Eye, EyeOff, Building2, Truck, Check, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner, inputCls, labelCls, btnPrimary } from '@/components/ui';

const MODULES = [
  {
    id: 'real_estate', label: 'Nexora Immo',
    desc: 'Gestion des biens immobiliers, locataires, loyers et maintenance',
    icon: <Building2 size={28}/>, color: 'border-blue-400 bg-blue-50 text-blue-700',
    active: 'border-blue-600 bg-blue-100 ring-2 ring-blue-400',
  },
  {
    id: 'logistics', label: 'Nexora Logistique',
    desc: 'Gestion de la flotte, commandes, livraisons et entrepot',
    icon: <Truck size={28}/>, color: 'border-green-400 bg-green-50 text-green-700',
    active: 'border-green-600 bg-green-100 ring-2 ring-green-400',
  },
];

export default function RegisterCompanyPage() {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [showPw, setShowPw]   = useState(false);

  // OTP
  const [otpSent, setOtpSent]       = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp]               = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const [form, setForm] = useState({
    company_name: '', company_email: '', company_phone: '',
    full_name: '', email: '', password: '', modules: [] as string[],
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const toggleModule = (id: string) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(id) ? f.modules.filter(m => m !== id) : [...f.modules, id],
    }));
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  };

  // ── Envoyer OTP ─────────────────────────────────────────────
  const sendOTP = async () => {
    if (!form.email.trim()) { toast.error('Entrez votre email'); return; }
    if (!form.email.includes('@')) { toast.error('Email invalide'); return; }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, company_name: form.company_name, modules: form.modules }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']);
      startResendTimer();

      // Si pas d'email configuré, le code est retourné directement
      if (data.dev_code) {
        toast.success(`Code de test : ${data.dev_code}`, { duration: 30000 });
        // Auto-remplir les cases OTP
        const digits = data.dev_code.split('');
        setOtp(digits);
      } else {
        toast.success('Code envoyé ! Vérifiez votre boîte mail.');
      }
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch { toast.error('Erreur envoi OTP'); }
    finally { setOtpLoading(false); }
  };

  // ── Gestion saisie OTP ───────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    // Auto-vérifier si tous les chiffres sont saisis
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      verifyOTP(pasted);
    }
  };

  // ── Vérifier OTP ────────────────────────────────────────────
  const verifyOTP = async (code: string) => {
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); setOtp(['', '', '', '', '', '']); setTimeout(() => otpRefs.current[0]?.focus(), 100); return; }
      setOtpVerified(true);
      toast.success('Email vérifié ✓');
    } catch { toast.error('Erreur vérification'); }
    finally { setOtpLoading(false); }
  };

  // ── Soumettre l'inscription ──────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) { toast.error('Vérifiez votre email avec le code OTP'); return; }
    if (form.password.length < 8) { toast.error('Mot de passe minimum 8 caractères'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email, password: form.password, full_name: form.full_name,
          company_name: form.company_name, company_email: form.company_email,
          company_phone: form.company_phone, modules: form.modules,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur inscription'); return; }
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  // ── Succès ───────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={36} className="text-green-600"/>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Demande envoyée !</h2>
          <p className="text-muted-foreground text-sm mb-2">
            Votre entreprise <span className="font-semibold text-foreground">{form.company_name}</span> est en attente de validation.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mt-4 mb-6 text-left space-y-2">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Prochaines étapes</p>
            <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
              <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Notre équipe examine votre demande (sous 24h)</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
              <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>Vous recevrez un email de confirmation à <strong>{form.email}</strong></span>
            </div>
            <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
              <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>Connectez-vous avec vos identifiants</span>
            </div>
          </div>
          <div className="flex gap-2 justify-center mb-6">
            {form.modules.map(m => (
              <span key={m} className={'px-3 py-1 rounded-full text-xs font-semibold ' + (m === 'real_estate' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                {m === 'real_estate' ? '🏠 Nexora Immo' : '🚚 Nexora Logistique'}
              </span>
            ))}
          </div>
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
            Retour à la connexion →
          </Link>
        </div>
      </div>
    );
  }

  const totalSteps = 4;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Zap size={22} className="text-white"/>
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">Nexora</span>
            <p className="text-xs text-muted-foreground -mt-0.5">Plateforme de gestion</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ' + (
                step > s ? 'bg-green-500 text-white' : step === s ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
              )}>
                {step > s ? <Check size={12}/> : s}
              </div>
              {s < totalSteps && <div className={'w-8 h-0.5 ' + (step > s ? 'bg-green-400' : 'bg-slate-200')}/>}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mb-5">
          {step === 1 ? 'Choisissez vos modules' : step === 2 ? 'Informations entreprise' : step === 3 ? 'Vérification email' : 'Votre compte administrateur'}
        </p>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-8 shadow-xl">

          {/* ── STEP 1 : Modules ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Que voulez-vous gérer ?</h1>
              <p className="text-sm text-muted-foreground mb-6">Sélectionnez un ou plusieurs modules</p>
              <div className="space-y-3 mb-6">
                {MODULES.map(m => {
                  const selected = form.modules.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleModule(m.id)} type="button"
                      className={'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ' + (selected ? m.active : 'border-border hover:border-slate-300 bg-white dark:bg-slate-800')}>
                      <div className={'p-2.5 rounded-xl flex-shrink-0 ' + (selected ? m.color : 'bg-slate-100 text-slate-500')}>{m.icon}</div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                      </div>
                      {selected && <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0"><Check size={13} className="text-white"/></div>}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => { if (form.modules.length === 0) { toast.error('Sélectionnez au moins un module'); return; } setStep(2); }}
                className={btnPrimary + ' w-full justify-center'}>Continuer</button>
            </div>
          )}

          {/* ── STEP 2 : Entreprise ──────────────────────────── */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Votre entreprise</h1>
              <p className="text-sm text-muted-foreground mb-6">Informations sur votre organisation</p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nom de l&apos;entreprise *</label>
                  <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Ex: Groupe Diallo Immobilier" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Email professionnel</label>
                  <input type="email" value={form.company_email} onChange={e => set('company_email', e.target.value)} placeholder="contact@entreprise.com" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input value={form.company_phone} onChange={e => set('company_phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputCls}/>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50 transition-colors">Retour</button>
                <button onClick={() => { if (!form.company_name.trim()) { toast.error('Nom entreprise requis'); return; } setStep(3); }}
                  className={btnPrimary + ' flex-1 justify-center'}>Continuer</button>
              </div>
            </div>
          )}

          {/* ── STEP 3 : Vérification OTP ────────────────────── */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Vérification email</h1>
              <p className="text-sm text-muted-foreground mb-6">Confirmez votre identité par email</p>

              {!otpVerified ? (
                <>
                  <div className="mb-4">
                    <label className={labelCls}>Votre email *</label>
                    <input
                      type="email" value={form.email} onChange={e => { set('email', e.target.value); setOtpSent(false); setOtp(['','','','','','']); }}
                      placeholder="vous@exemple.com" className={inputCls} disabled={otpSent}
                    />
                  </div>

                  {!otpSent ? (
                    <button onClick={sendOTP} disabled={otpLoading || !form.email}
                      className={btnPrimary + ' w-full justify-center'}>
                      {otpLoading ? <LoadingSpinner size={16}/> : <><Mail size={15}/> Recevoir le code</>}
                    </button>
                  ) : (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-5 flex items-center gap-2">
                        <Mail size={15} className="text-blue-500 flex-shrink-0"/>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Code envoyé à <strong>{form.email}</strong>. Vérifiez vos spams.
                        </p>
                      </div>

                      {/* Inputs OTP */}
                      <div className="flex gap-2 justify-center mb-5" onPaste={handleOtpPaste}>
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => { otpRefs.current[i] = el; }}
                            type="text" inputMode="numeric" maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className={'w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none ' + (
                              digit ? 'border-primary bg-primary/5 text-primary' : 'border-border'
                            ) + (otpLoading ? ' opacity-50' : '')}
                            disabled={otpLoading}
                          />
                        ))}
                      </div>

                      {otpLoading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                          <LoadingSpinner size={14}/> Vérification...
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <span>Pas reçu ?</span>
                        {resendTimer > 0 ? (
                          <span className="text-primary font-medium">Renvoyer dans {resendTimer}s</span>
                        ) : (
                          <button onClick={sendOTP} disabled={otpLoading}
                            className="text-primary font-medium hover:underline flex items-center gap-1">
                            <RefreshCw size={11}/> Renvoyer
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* Email vérifié */
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck size={28} className="text-green-600"/>
                  </div>
                  <p className="font-bold text-green-700 mb-1">Email vérifié !</p>
                  <p className="text-xs text-muted-foreground">{form.email}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(2); setOtpSent(false); setOtpVerified(false); setOtp(['','','','','','']); }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50 transition-colors">Retour</button>
                <button onClick={() => { if (!otpVerified) { toast.error('Vérifiez votre email'); return; } setStep(4); }}
                  disabled={!otpVerified}
                  className={btnPrimary + ' flex-1 justify-center disabled:opacity-50'}>Continuer</button>
              </div>
            </div>
          )}

          {/* ── STEP 4 : Compte admin ────────────────────────── */}
          {step === 4 && (
            <form onSubmit={handleSubmit}>
              <h1 className="text-xl font-bold text-foreground mb-1">Votre compte</h1>
              <p className="text-sm text-muted-foreground mb-6">Vous serez l&apos;administrateur de l&apos;entreprise</p>

              {/* Email vérifié */}
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-4">
                <ShieldCheck size={15} className="text-green-600 flex-shrink-0"/>
                <p className="text-xs text-green-700 dark:text-green-300">Email vérifié : <strong>{form.email}</strong></p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Votre nom complet *</label>
                  <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Prenom Nom" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Mot de passe *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                      required minLength={8} placeholder="Minimum 8 caractères" className={inputCls + ' pr-10'}/>
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {/* Indicateur force mot de passe */}
                  {form.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={'h-1 flex-1 rounded-full transition-colors ' + (
                            form.password.length >= i * 2
                              ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                              : 'bg-slate-200'
                          )}/>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {form.password.length < 4 ? 'Trop court' : form.password.length < 6 ? 'Faible' : form.password.length < 8 ? 'Moyen' : 'Fort ✓'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Récap */}
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Récapitulatif</p>
                  {form.company_name && <p className="text-xs text-foreground">🏢 {form.company_name}</p>}
                  <p className="text-xs text-foreground">📧 {form.email}</p>
                  <div className="flex gap-2 flex-wrap">
                    {form.modules.map(m => (
                      <span key={m} className={'text-[10px] px-2 py-0.5 rounded-full font-semibold ' + (m === 'real_estate' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                        {m === 'real_estate' ? '🏠 Immo' : '🚚 Logistique'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50 transition-colors">Retour</button>
                <button type="submit" disabled={loading} className={btnPrimary + ' flex-1 justify-center'}>
                  {loading ? <LoadingSpinner size={16}/> : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}