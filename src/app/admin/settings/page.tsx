'use client';
import { useEffect, useState } from 'react';
import { Save, Building2, Bell, Shield, Puzzle, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, btnPrimary, cardCls } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from 'sonner';

const MODULES = [
  { id: 'real_estate',    label: 'Gestion immobilière',  desc: 'Biens, locataires, loyers, maintenance' },
  { id: 'logistics',      label: 'Gestion logistique',   desc: 'Commandes, livraisons, flotte' },
  { id: 'online_payments',label: 'Paiements en ligne',   desc: 'Wave, Orange Money, CinetPay' },
  { id: 'document_gen',   label: 'Génération PDF',       desc: 'Quittances, contrats' },
  { id: 'notifications',  label: 'Notifications',        desc: 'Email, SMS, WhatsApp' },
];

type CompanyForm = { name:string; email:string; phone:string; address:string; modules:string[] };

export default function SettingsPage() {
  const { company, user, setCompany } = useAuthStore();
  const [tab, setTab] = useState<'company'|'profile'|'modules'|'security'>('company');
  const [form, setForm] = useState<CompanyForm>({ name:'', email:'', phone:'', address:'', modules:[] });
  const [logoUrl, setLogoUrl] = useState<string|null>(null);
  const [profile, setProfile] = useState({ full_name:'', email:'' });
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null);
  const [passwords, setPasswords] = useState({ next:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const set = (k: keyof CompanyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (company) {
      setForm({ name:company.name||'', email:company.email||'', phone:company.phone||'', address:company.address||'', modules:company.modules||[] });
      setLogoUrl((company as any).logo_url || null);
      setFetching(false);
    }
    if (user) {
      setProfile({ full_name:user.full_name||'', email:user.email||'' });
      setAvatarUrl(user.avatar_url || null);
    }
  }, [company, user]);

  const toggleModule = (id: string) =>
    setForm(f => ({ ...f, modules: f.modules.includes(id) ? f.modules.filter(m=>m!==id) : [...f.modules, id] }));

  const saveCompany = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!company?.id) return;
    setLoading(true);
    const payload = { name:form.name, email:form.email||null, phone:form.phone||null, address:form.address||null, modules:form.modules, logo_url:logoUrl };
    const { error } = await createClient().from('companies').update(payload as never).eq('id', company.id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setCompany({ ...company, ...payload });
    toast.success('Entreprise mise à jour');
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    const { error } = await createClient().from('users').update({ full_name:profile.full_name, avatar_url:avatarUrl } as never).eq('id', user.id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profil mis à jour');
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: passwords.next });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Mot de passe mis à jour');
    setPasswords({ next:'', confirm:'' });
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;

  const tabs = [
    { id:'company',  label:'Entreprise', icon:<Building2 size={15}/> },
    { id:'profile',  label:'Mon profil', icon:<User size={15}/> },
    { id:'modules',  label:'Modules',    icon:<Puzzle size={15}/> },
    { id:'security', label:'Sécurité',   icon:<Shield size={15}/> },
  ] as const;

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Configuration de la plateforme" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all '+(tab===t.id?'bg-white dark:bg-slate-800 text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Company tab ─────────────────────────────── */}
      {tab === 'company' && (
        <form onSubmit={saveCompany} className={cardCls + ' p-6 max-w-2xl'}>
          <h3 className="font-semibold text-foreground mb-5">Informations de l&apos;entreprise</h3>

          {/* Logo upload */}
          <div className="mb-6 pb-6 border-b border-border">
            <ImageUpload
              bucket="companies"
              folder={company?.id || 'logos'}
              value={logoUrl}
              onChange={setLogoUrl}
              label="Logo de l'entreprise"
              shape="square"
              size="lg"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Ce logo apparaîtra sur vos contrats, quittances et PDF générés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Nom de l&apos;entreprise *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} required className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Email professionnel</label>
              <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input value={form.phone} onChange={e=>set('phone',e.target.value)} className={inputCls}/>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Adresse</label>
              <input value={form.address} onChange={e=>set('address',e.target.value)} className={inputCls}/>
            </div>
          </div>
          <div className="mt-6">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? <LoadingSpinner size={16}/> : <Save size={16}/>}Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* ── Profile tab ─────────────────────────────── */}
      {tab === 'profile' && (
        <form onSubmit={saveProfile} className={cardCls + ' p-6 max-w-2xl'}>
          <h3 className="font-semibold text-foreground mb-5">Mon profil</h3>

          {/* Avatar upload */}
          <div className="mb-6 pb-6 border-b border-border">
            <ImageUpload
              bucket="avatars"
              folder={user?.id || 'users'}
              value={avatarUrl}
              onChange={setAvatarUrl}
              label="Photo de profil"
              shape="circle"
              size="lg"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nom complet</label>
              <input value={profile.full_name} onChange={e=>setProfile(p=>({...p,full_name:e.target.value}))} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input value={profile.email} disabled className={inputCls+' opacity-60 cursor-not-allowed'}/>
              <p className="text-xs text-muted-foreground mt-1">L&apos;email ne peut pas être modifié ici.</p>
            </div>
          </div>
          <div className="mt-6">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? <LoadingSpinner size={16}/> : <Save size={16}/>}Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* ── Modules tab ─────────────────────────────── */}
      {tab === 'modules' && (
        <div className="max-w-2xl space-y-4">
          <div className={cardCls + ' p-6'}>
            <h3 className="font-semibold text-foreground mb-1">Modules actifs</h3>
            <p className="text-sm text-muted-foreground mb-4">Activez ou désactivez les modules selon votre abonnement.</p>
            <div className="space-y-3">
              {MODULES.map(m => (
                <div key={m.id} onClick={()=>toggleModule(m.id)}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium text-foreground text-sm">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                  <div className={'w-10 h-6 rounded-full transition-colors relative flex-shrink-0 '+(form.modules.includes(m.id)?'bg-primary':'bg-slate-200 dark:bg-slate-600')}>
                    <div className={'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all '+(form.modules.includes(m.id)?'left-[18px]':'left-0.5')}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <button onClick={saveCompany} disabled={loading} className={btnPrimary}>
                {loading ? <LoadingSpinner size={16}/> : <Save size={16}/>}Sauvegarder les modules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security tab ─────────────────────────────── */}
      {tab === 'security' && (
        <form onSubmit={savePassword} className={cardCls + ' p-6 max-w-md'}>
          <h3 className="font-semibold text-foreground mb-4">Changer le mot de passe</h3>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nouveau mot de passe *</label>
              <input type="password" value={passwords.next} onChange={e=>setPasswords(p=>({...p,next:e.target.value}))} required minLength={8} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Confirmer le mot de passe *</label>
              <input type="password" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))} required minLength={8} className={inputCls}/>
            </div>
          </div>
          <div className="mt-6">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? <LoadingSpinner size={16}/> : <Shield size={16}/>}Mettre à jour
            </button>
          </div>
        </form>
      )}
    </div>
  );
}