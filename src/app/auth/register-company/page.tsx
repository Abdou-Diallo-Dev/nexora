'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Zap, Eye, EyeOff, Building2, Truck, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { LoadingSpinner, inputCls, labelCls, btnPrimary } from '@/components/ui';

const MODULES = [
  {
    id: 'real_estate',
    label: 'Nexora Immo',
    desc: 'Gestion des biens immobiliers, locataires, loyers et maintenance',
    icon: <Building2 size={28}/>,
    color: 'border-blue-400 bg-blue-50 text-blue-700',
    active: 'border-blue-600 bg-blue-100 ring-2 ring-blue-400',
  },
  {
    id: 'logistics',
    label: 'Nexora Logistique',
    desc: 'Gestion de la flotte, commandes, livraisons et entrepot',
    icon: <Truck size={28}/>,
    color: 'border-green-400 bg-green-50 text-green-700',
    active: 'border-green-600 bg-green-100 ring-2 ring-green-400',
  },
];

export default function RegisterCompanyPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    full_name: '',
    email: '',
    password: '',
    modules: [] as string[],
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const toggleModule = (id: string) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(id)
        ? f.modules.filter(m => m !== id)
        : [...f.modules, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.modules.length === 0) { toast.error('Selectionnez au moins un module'); return; }
    if (form.password.length < 6) { toast.error('Mot de passe minimum 6 caracteres'); return; }
    setLoading(true);
    try {
      // 1. Create auth account
      const { data: authData, error: authError } = await createClient().auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name },
          emailRedirectTo: window.location.origin + '/auth/login',
        },
      });
      if (authError) { toast.error(authError.message); return; }
      const uid = authData.user?.id;
      if (!uid) { toast.error('Erreur creation compte'); return; }

      // 2. Create company (inactive until approved)
      const { data: company, error: compError } = await createClient().from('companies').insert({
        name: form.company_name,
        email: form.company_email || form.email,
        phone: form.company_phone || null,
        modules: form.modules,
        plan: 'free',
        is_active: false, // pending approval
      } as never).select().single();
      if (compError) { toast.error('Erreur creation entreprise'); return; }

      // 3. Create user profile linked to company
      // Step 1: upsert
      await createClient().from('users').upsert({
        id: uid,
        email: form.email,
        full_name: form.full_name,
        role: 'admin',
        company_id: (company as any).id,
        is_active: false,
      } as never);
      // Step 2: force update to override trigger default role
      await createClient().from('users').update({
        role: 'admin',
        company_id: (company as any).id,
        is_active: false,
        full_name: form.full_name,
      } as never).eq('id', uid);

      setDone(true);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // ── Done screen ────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600"/>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Demande envoyee !</h2>
          <p className="text-muted-foreground text-sm mb-2">
            Votre entreprise <span className="font-semibold text-foreground">{form.company_name}</span> est en attente de validation.
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            Notre equipe va examiner votre demande et vous contacter sous 24h.
          </p>
          <div className="flex gap-2 justify-center mb-4">
            {form.modules.map(m => (
              <span key={m} className={'px-3 py-1 rounded-full text-xs font-semibold '+(m==='real_estate'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700')}>
                {m==='real_estate' ? '🏠 Nexora Immo' : '🚚 Nexora Logistique'}
              </span>
            ))}
          </div>
          <Link href="/auth/login" className="text-primary hover:underline text-sm font-medium">
            Retour a la connexion
          </Link>
        </div>
      </div>
    );
  }

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

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all '+(
                step>s ? 'bg-green-500 text-white' :
                step===s ? 'bg-primary text-white' :
                'bg-slate-200 text-slate-500'
              )}>
                {step>s ? <Check size={12}/> : s}
              </div>
              {s < 3 && <div className={'w-10 h-0.5 '+(step>s?'bg-green-400':'bg-slate-200')}/>}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mb-6">
          {step===1 ? 'Choisissez vos modules' : step===2 ? 'Informations entreprise' : 'Votre compte administrateur'}
        </p>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-8 shadow-xl">

          {/* ── STEP 1: Choose modules ─────────────────────── */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Que voulez-vous gerer ?</h1>
              <p className="text-sm text-muted-foreground mb-6">Selectionnez un ou plusieurs modules</p>
              <div className="space-y-3 mb-6">
                {MODULES.map(m => {
                  const selected = form.modules.includes(m.id);
                  return (
                    <button key={m.id} onClick={()=>toggleModule(m.id)} type="button"
                      className={'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left '+(selected ? m.active : 'border-border hover:border-slate-300 bg-white dark:bg-slate-800')}>
                      <div className={'p-2.5 rounded-xl flex-shrink-0 '+(selected?m.color:'bg-slate-100 text-slate-500')}>
                        {m.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                      </div>
                      {selected && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={13} className="text-white"/>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>{ if(form.modules.length===0){toast.error('Selectionnez au moins un module');return;} setStep(2); }}
                className={btnPrimary+' w-full justify-center'}>
                Continuer
              </button>
            </div>
          )}

          {/* ── STEP 2: Company info ───────────────────────── */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">Votre entreprise</h1>
              <p className="text-sm text-muted-foreground mb-6">Informations sur votre organisation</p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nom de l'entreprise *</label>
                  <input value={form.company_name} onChange={e=>set('company_name',e.target.value)}
                    required placeholder="Ex: Groupe Diallo Immobilier" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Email professionnel</label>
                  <input type="email" value={form.company_email} onChange={e=>set('company_email',e.target.value)}
                    placeholder="contact@entreprise.com" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Telephone</label>
                  <input value={form.company_phone} onChange={e=>set('company_phone',e.target.value)}
                    placeholder="+221 77 000 00 00" className={inputCls}/>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={()=>setStep(1)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50 transition-colors">
                  Retour
                </button>
                <button onClick={()=>{ if(!form.company_name.trim()){toast.error('Nom entreprise requis');return;} setStep(3); }}
                  className={btnPrimary+' flex-1 justify-center'}>
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Admin account ──────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <h1 className="text-xl font-bold text-foreground mb-1">Votre compte</h1>
              <p className="text-sm text-muted-foreground mb-6">Vous serez l'administrateur de l'entreprise</p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Votre nom complet *</label>
                  <input value={form.full_name} onChange={e=>set('full_name',e.target.value)}
                    required placeholder="Prenom Nom" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Email de connexion *</label>
                  <input type="email" value={form.email} onChange={e=>set('email',e.target.value)}
                    required placeholder="vous@exemple.com" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Mot de passe *</label>
                  <div className="relative">
                    <input type={showPw?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)}
                      required placeholder="Minimum 6 caracteres" className={inputCls+' pr-10'}/>
                    <button type="button" onClick={()=>setShowPw(v=>!v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recapitulatif</p>
                  {form.company_name && <p className="text-xs text-foreground">🏢 {form.company_name}</p>}
                  <div className="flex gap-2">
                    {form.modules.map(m=>(
                      <span key={m} className={'text-[10px] px-2 py-0.5 rounded-full font-semibold '+(m==='real_estate'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700')}>
                        {m==='real_estate'?'Immo':'Logistique'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={()=>setStep(2)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50 transition-colors">
                  Retour
                </button>
                <button type="submit" disabled={loading} className={btnPrimary+' flex-1 justify-center'}>
                  {loading ? <LoadingSpinner size={16}/> : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Deja un compte ?{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}