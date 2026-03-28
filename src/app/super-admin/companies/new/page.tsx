'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, Palette, Settings, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { getCommissionModeLabel, type CommissionMode } from '@/lib/commission';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#3d2674', '#1e40af', '#7c3aed', '#0d9488',
  '#16a34a', '#dc2626', '#ea580c', '#db2777',
];

const MODULES = [
  { id: 'real_estate', label: 'Immobilier' },
  { id: 'logistics', label: 'Logistique' },
];

const PLANS = [
  { value: 'free',       label: 'Free' },
  { value: 'starter',    label: 'Starter' },
  { value: 'pro',        label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function NewCompanyPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    plan: 'starter',
    modules: ['real_estate', 'logistics'] as string[],
    is_active: true,
    primary_color: '#3d2674',
    secondary_color: '#faab2d',
    commission_rate: 10,
    commission_mode: 'ttc' as CommissionMode,
    vat_rate: 18,
  });

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleModule = (m: string) =>
    set('modules', form.modules.includes(m) ? form.modules.filter(x => x !== m) : [...form.modules, m]);

  if (user?.role !== 'super_admin') return <div className="text-center py-16 text-muted-foreground">Acces refuse</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Le nom est obligatoire'); return; }
    setLoading(true);
    const { error } = await createClient().from('companies').insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      plan: form.plan,
      modules: form.modules,
      is_active: form.is_active,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      commission_rate: form.commission_rate,
      commission_mode: form.commission_mode,
      vat_rate: form.vat_rate,
      logo_url: logoUrl,
    } as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Entreprise creee');
    router.push('/super-admin/companies');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/super-admin/companies" className={btnSecondary + ' !px-3'}><ArrowLeft size={16}/></Link>
        <PageHeader title="Nouvelle entreprise"/>
      </div>

      <form onSubmit={submit} className="space-y-5">

        {/* Informations generales */}
        <div className={cardCls + ' p-6 space-y-4'}>
          <h2 className="font-bold text-foreground flex items-center gap-2"><Building2 size={16} className="text-primary"/>Informations generales</h2>

          <ImageUpload
            bucket="logos"
            folder="companies"
            value={logoUrl}
            onChange={setLogoUrl}
            label="Logo"
            shape="square"
            size="lg"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Nom *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} placeholder="SARPA Immobilier"/>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="contact@entreprise.com"/>
            </div>
            <div>
              <label className={labelCls}>Telephone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+224 6xx xx xx xx"/>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Adresse</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="Conakry, Guinee"/>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className={cardCls + ' p-6 space-y-4'}>
          <h2 className="font-bold text-foreground flex items-center gap-2"><Palette size={16} className="text-primary"/>Couleurs & Branding</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Couleur principale</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"/>
                <input value={form.primary_color} onChange={e => set('primary_color', e.target.value)} className={inputCls + ' flex-1 font-mono text-sm'} placeholder="#3d2674"/>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('primary_color', c)}
                    className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: form.primary_color === c ? '#000' : 'transparent' }}/>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Couleur secondaire</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.secondary_color} onChange={e => set('secondary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"/>
                <input value={form.secondary_color} onChange={e => set('secondary_color', e.target.value)} className={inputCls + ' flex-1 font-mono text-sm'} placeholder="#faab2d"/>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="h-10 flex items-center px-4 gap-3" style={{ backgroundColor: form.primary_color }}>
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="h-6 w-6 rounded object-cover"/>
                : <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center text-white text-xs font-bold">{form.name?.[0] || 'A'}</div>
              }
              <span className="text-white text-sm font-semibold">{form.name || 'Nom entreprise'}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: form.secondary_color, color: form.primary_color }}>
                {form.plan}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-xs text-muted-foreground">Apercu du branding dans la sidebar</p>
            </div>
          </div>
        </div>

        {/* Plan & Modules */}
        <div className={cardCls + ' p-6 space-y-4'}>
          <h2 className="font-bold text-foreground flex items-center gap-2"><CreditCard size={16} className="text-primary"/>Plan & Modules</h2>

          <div>
            <label className={labelCls}>Plan</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {PLANS.map(p => (
                <button key={p.value} type="button" onClick={() => set('plan', p.value)}
                  className={'px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ' + (form.plan === p.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Modules actives</label>
            <div className="flex gap-2 mt-1">
              {MODULES.map(m => (
                <button key={m.id} type="button" onClick={() => toggleModule(m.id)}
                  className={'px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ' + (form.modules.includes(m.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className={labelCls}>Statut initial</label>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={'px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ' + (form.is_active ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-600')}>
              {form.is_active ? 'Active' : 'Suspendue'}
            </button>
          </div>
        </div>

        {/* Parametres financiers */}
        <div className={cardCls + ' p-6 space-y-4'}>
          <h2 className="font-bold text-foreground flex items-center gap-2"><Settings size={16} className="text-primary"/>Parametres financiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Mode commission</label>
              <select value={form.commission_mode} onChange={e => set('commission_mode', e.target.value as CommissionMode)} className={selectCls}>
                <option value="none">Aucune</option>
                <option value="ht">HT</option>
                <option value="ttc">TTC</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">{getCommissionModeLabel(form)}</p>
            </div>
            <div>
              <label className={labelCls}>Taux commission (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.commission_rate}
                onChange={e => set('commission_rate', parseFloat(e.target.value) || 0)}
                disabled={form.commission_mode === 'none'} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>TVA (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.vat_rate}
                onChange={e => set('vat_rate', parseFloat(e.target.value) || 0)}
                disabled={form.commission_mode !== 'ttc'} className={inputCls}/>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pb-6">
          <Link href="/super-admin/companies" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? <LoadingSpinner size={16}/> : <Save size={16}/>}
            Creer l'entreprise
          </button>
        </div>
      </form>
    </div>
  );
}
