'use client';
import { useEffect, useState } from 'react';
import { Save, Building2, Shield, User, Palette, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, btnPrimary, cardCls } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from 'sonner';

const PRESET_COLORS = [
  { name: 'Bleu Nexora',   value: '#1e40af' },
  { name: 'Vert',          value: '#16a34a' },
  { name: 'Violet',        value: '#7c3aed' },
  { name: 'Rouge',         value: '#dc2626' },
  { name: 'Orange',        value: '#ea580c' },
  { name: 'Indigo',        value: '#4338ca' },
  { name: 'Teal',          value: '#0d9488' },
  { name: 'Rose',          value: '#db2777' },
];

type CompanyForm = { name:string; email:string; phone:string; address:string; primary_color:string };

export default function SettingsPage() {
  const { company, user, setCompany } = useAuthStore();
  const [tab, setTab] = useState<'company'|'profile'|'appearance'|'security'>('company');
  const [form, setForm] = useState<CompanyForm>({ name:'', email:'', phone:'', address:'', primary_color:'#1e40af' });
  const [logoUrl, setLogoUrl] = useState<string|null>(null);
  const [profile, setProfile] = useState({ full_name:'', email:'' });
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null);
  const [passwords, setPasswords] = useState({ next:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const set = (k: keyof CompanyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (company) {
      setForm({
        name:          company.name || '',
        email:         company.email || '',
        phone:         company.phone || '',
        address:       (company as any).address || '',
        primary_color: (company as any).primary_color || '#1e40af',
      });
      setLogoUrl((company as any).logo_url || null);
      setFetching(false);
    }
    if (user) {
      setProfile({ full_name: user.full_name || '', email: user.email || '' });
      setAvatarUrl(user.avatar_url || null);
    }
  }, [company, user]);

  const saveCompany = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!company?.id) return;
    setLoading(true);
    const payload = {
      name:          form.name,
      email:         form.email || null,
      phone:         form.phone || null,
      address:       form.address || null,
      logo_url:      logoUrl,
      primary_color: form.primary_color,
    };
    const { error } = await createClient().from('companies').update(payload as never).eq('id', company.id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setCompany({ ...company, ...payload });
    toast.success('Paramètres enregistrés');
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);
    const { error } = await createClient().from('users').update({ full_name: profile.full_name, avatar_url: avatarUrl } as never).eq('id', user.id);
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

  if (fetching) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;

  const tabs = [
    { id:'company',    label:'Entreprise', icon:<Building2 size={15}/> },
    { id:'appearance', label:'Apparence',  icon:<Palette size={15}/> },
    { id:'profile',    label:'Mon profil', icon:<User size={15}/> },
    { id:'security',   label:'Sécurité',   icon:<Shield size={15}/> },
  ] as const;

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Configuration de la plateforme"/>

      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all '+(tab===t.id?'bg-white dark:bg-slate-800 text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Entreprise ── */}
      {tab === 'company' && (
        <form onSubmit={saveCompany} className={cardCls+' p-6 max-w-2xl'}>
          <h3 className="font-semibold text-foreground mb-5">Informations de l&apos;entreprise</h3>
          <div className="mb-6 pb-6 border-b border-border">
            <ImageUpload bucket="companies" folder={company?.id||'logos'} value={logoUrl} onChange={v => { setLogoUrl(v); }} label="Logo de l'entreprise" shape="square" size="lg"/>
            <p className="text-xs text-muted-foreground mt-2">Ce logo apparaîtra automatiquement sur tous vos PDFs (contrats, quittances, tickets).</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className={labelCls}>Nom de l&apos;entreprise *</label><input value={form.name} onChange={e=>set('name',e.target.value)} required className={inputCls}/></div>
            <div><label className={labelCls}>Email professionnel</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Téléphone</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} className={inputCls}/></div>
            <div className="md:col-span-2"><label className={labelCls}>Adresse</label><input value={form.address} onChange={e=>set('address',e.target.value)} className={inputCls}/></div>
          </div>
          <div className="mt-6">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? <LoadingSpinner size={16}/> : <Save size={16}/>}Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* ── Apparence ── */}
      {tab === 'appearance' && (
        <div className={cardCls+' p-6 max-w-2xl space-y-6'}>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Couleur principale</h3>
            <p className="text-sm text-muted-foreground mb-4">Cette couleur sera utilisée dans tous vos documents PDF générés.</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {PRESET_COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => set('primary_color', c.value)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105"
                  style={{ borderColor: form.primary_color === c.value ? c.value : 'transparent' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.value }}>
                    {form.primary_color === c.value && <Check size={16} className="text-white"/>}
                  </div>
                  <span className="text-xs text-muted-foreground">{c.name}</span>
                </button>
              ))}
            </div>
            <div>
              <label className={labelCls}>Couleur personnalisée</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer border border-border"/>
                <input value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                  placeholder="#1e40af" className={inputCls+' flex-1'}/>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Aperçu du header PDF</h3>
            <div className="rounded-xl overflow-hidden border border-border">
              <div className="p-4 flex items-center gap-3" style={{ background: form.primary_color }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" className="w-10 h-10 object-contain rounded-lg bg-white p-1"/>
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {form.name.charAt(0) || 'N'}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">{form.name || 'Votre entreprise'}</p>
                  <p className="text-white/70 text-xs">CONTRAT DE BAIL D'HABITATION</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800">
                <div className="h-2 rounded w-3/4 mb-2" style={{ background: form.primary_color, opacity: 0.2 }}/>
                <div className="h-2 rounded w-1/2 bg-slate-200 dark:bg-slate-700"/>
              </div>
            </div>
          </div>

          <button onClick={saveCompany} disabled={loading} className={btnPrimary}>
            {loading ? <LoadingSpinner size={16}/> : <Save size={16}/>}Enregistrer l&apos;apparence
          </button>
        </div>
      )}

      {/* ── Profil ── */}
      {tab === 'profile' && (
        <form onSubmit={saveProfile} className={cardCls+' p-6 max-w-2xl'}>
          <h3 className="font-semibold text-foreground mb-5">Mon profil</h3>
          <div className="mb-6 pb-6 border-b border-border">
            <ImageUpload bucket="avatars" folder={user?.id||'users'} value={avatarUrl} onChange={setAvatarUrl} label="Photo de profil" shape="circle" size="lg"/>
          </div>
          <div className="space-y-4">
            <div><label className={labelCls}>Nom complet</label><input value={profile.full_name} onChange={e=>setProfile(p=>({...p,full_name:e.target.value}))} className={inputCls}/></div>
            <div><label className={labelCls}>Email</label><input value={profile.email} disabled className={inputCls+' opacity-60 cursor-not-allowed'}/><p className="text-xs text-muted-foreground mt-1">L&apos;email ne peut pas être modifié ici.</p></div>
          </div>
          <div className="mt-6"><button type="submit" disabled={loading} className={btnPrimary}>{loading?<LoadingSpinner size={16}/>:<Save size={16}/>}Enregistrer</button></div>
        </form>
      )}

      {/* ── Sécurité ── */}
      {tab === 'security' && (
        <form onSubmit={savePassword} className={cardCls+' p-6 max-w-md'}>
          <h3 className="font-semibold text-foreground mb-4">Changer le mot de passe</h3>
          <div className="space-y-4">
            <div><label className={labelCls}>Nouveau mot de passe *</label><input type="password" value={passwords.next} onChange={e=>setPasswords(p=>({...p,next:e.target.value}))} required minLength={8} className={inputCls}/></div>
            <div><label className={labelCls}>Confirmer *</label><input type="password" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))} required minLength={8} className={inputCls}/></div>
          </div>
          <div className="mt-6"><button type="submit" disabled={loading} className={btnPrimary}>{loading?<LoadingSpinner size={16}/>:<Shield size={16}/>}Mettre à jour</button></div>
        </form>
      )}
    </div>
  );
}