'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: 'available',  label: 'Disponible', dot: '#16a34a' },
  { value: 'off',        label: 'En repos',   dot: '#ea580c' },
  { value: 'inactive',   label: 'Inactif',    dot: '#9ca3af' },
];

export default function NewDriverPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    license_number: '', license_expiry: '',
    id_card_number: '', id_card_expiry: '',
    status: 'available', notes: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.first_name || !form.phone) { toast.error('Prenom et telephone requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('drivers').insert({
      company_id: company!.id,
      first_name: form.first_name, last_name: form.last_name,
      phone: form.phone, email: form.email || null,
      license_number: form.license_number || null,
      license_expiry: form.license_expiry || null,
      id_card_number: form.id_card_number || null,
      id_card_expiry: form.id_card_expiry || null,
      status: form.status, notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Chauffeur ajoute !');
    router.push('/logistics/drivers');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/drivers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors">
          <ArrowLeft size={18}/>
        </Link>
        <PageHeader title="Nouveau chauffeur" subtitle="Ajouter un chauffeur a votre flotte"/>
      </div>

      <div className="max-w-2xl">
        <div className={cardCls + ' p-6 space-y-5'}>
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-primary"/>
            <h3 className="font-semibold">Informations personnelles</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prenom *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Nom</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Telephone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls}/>
            </div>
          </div>

          <div className="pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Documents</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>N° Permis</label>
                <input value={form.license_number} onChange={e => set('license_number', e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Expiration permis</label>
                <input type="date" value={form.license_expiry} onChange={e => set('license_expiry', e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>N° CNI</label>
                <input value={form.id_card_number} onChange={e => set('id_card_number', e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Expiration CNI</label>
                <input type="date" value={form.id_card_expiry} onChange={e => set('id_card_expiry', e.target.value)} className={inputCls}/>
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-border">
            <label className={labelCls}>Statut</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} type="button"
                  onClick={() => set('status', s.value)}
                  className={'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ' +
                    (form.status === s.value ? 'border-transparent shadow-sm' : 'border-border text-muted-foreground hover:border-border/60')}
                  style={form.status === s.value ? { backgroundColor: s.dot + '18', borderColor: s.dot, color: s.dot } : {}}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.dot }}/>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none w-full'}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className={btnPrimary + ' flex-1 justify-center'}>
              {saving ? <LoadingSpinner size={15}/> : <User size={15}/>}
              {saving ? 'Enregistrement...' : 'Ajouter le chauffeur'}
            </button>
            <Link href="/logistics/drivers" className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
