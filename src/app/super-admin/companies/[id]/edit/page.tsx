'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCommissionModeLabel, type CommissionMode } from '@/lib/commission';
import { PageHeader, LoadingSpinner, inputCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

const MODULES = [
  { id: 'real_estate', label: 'Immobilier' },
  { id: 'logistics', label: 'Logistique' },
];
const PLANS = ['free', 'starter', 'pro', 'enterprise'];

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    plan: 'starter',
    modules: [] as string[],
    is_active: true,
    commission_rate: 10,
    commission_mode: 'ttc' as CommissionMode,
    vat_rate: 18,
  });

  useEffect(() => {
    createClient().from('companies').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            plan: data.plan || 'starter',
            modules: data.modules || [],
            is_active: data.is_active ?? true,
            commission_rate: data.commission_rate ?? 10,
            commission_mode: data.commission_mode ?? 'ttc',
            vat_rate: data.vat_rate ?? 18,
          });
        }
        setLoading(false);
      });
  }, [id]);

  const toggleModule = (m: string) =>
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    setSaving(true);
    const { error } = await createClient()
      .from('companies')
      .update({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        plan: form.plan,
        modules: form.modules,
        is_active: form.is_active,
        commission_rate: form.commission_rate,
        commission_mode: form.commission_mode,
        vat_rate: form.vat_rate,
      } as never)
      .eq('id', id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Entreprise mise a jour');
    router.push('/super-admin/companies/' + id);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={'/super-admin/companies/' + id} className={btnSecondary + ' !px-3'}>
          <ArrowLeft size={16} />
        </Link>
        <PageHeader title="Modifier l'entreprise" />
      </div>

      <div className={cardCls + ' p-6 space-y-4'}>
        <h2 className="font-bold text-foreground">Informations generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Nom *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telephone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Adresse</label>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputCls} />
          </div>
        </div>
      </div>

      <div className={cardCls + ' p-6 space-y-4'}>
        <h2 className="font-bold text-foreground">Parametres financiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Mode de commission</label>
            <select value={form.commission_mode} onChange={(e) => setForm((f) => ({ ...f, commission_mode: e.target.value as CommissionMode }))} className={inputCls}>
              <option value="none">Aucune commission</option>
              <option value="ht">Commission HT</option>
              <option value="ttc">Commission TTC</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">{getCommissionModeLabel(form)}</p>
          </div>
          <div>
            <label className={labelCls}>Taux de commission (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.commission_rate}
              onChange={(e) => setForm((f) => ({ ...f, commission_rate: parseFloat(e.target.value) || 0 }))}
              disabled={form.commission_mode === 'none'}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>TVA sur commission (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.vat_rate}
              onChange={(e) => setForm((f) => ({ ...f, vat_rate: parseFloat(e.target.value) || 0 }))}
              disabled={form.commission_mode !== 'ttc'}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className={cardCls + ' p-6 space-y-4'}>
        <h2 className="font-bold text-foreground">Plan & Modules</h2>
        <div>
          <label className={labelCls}>Plan</label>
          <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className={inputCls}>
            {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Modules actives</label>
          <div className="flex gap-3 mt-1">
            {MODULES.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleModule(m.id)}
                className={'px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ' + (form.modules.includes(m.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className={labelCls}>Statut</label>
          <button
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            className={'px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ' + (form.is_active ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-600')}
          >
            {form.is_active ? 'Active' : 'Suspendue'}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <Link href={'/super-admin/companies/' + id} className={btnSecondary}>Annuler</Link>
        <button onClick={handleSave} disabled={saving} className={btnPrimary + ' gap-2'}>
          {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
