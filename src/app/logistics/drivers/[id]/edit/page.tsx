'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { inputCls, labelCls, cardCls, LoadingSpinner } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: 'available',  label: 'Disponible', dot: '#16a34a' },
  { value: 'on_mission', label: 'En mission', dot: '#2563eb' },
  { value: 'off',        label: 'En repos',   dot: '#ea580c' },
  { value: 'inactive',   label: 'Inactif',    dot: '#9ca3af' },
];

type Form = {
  first_name: string; last_name: string; phone: string; email: string;
  license_number: string; license_expiry: string;
  id_card_number: string; id_card_expiry: string;
  status: string; notes: string;
};

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    first_name: '', last_name: '', phone: '', email: '',
    license_number: '', license_expiry: '',
    id_card_number: '', id_card_expiry: '',
    status: 'available', notes: '',
  });

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!id) return;
    createClient().from('drivers').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          email: data.email || '',
          license_number: data.license_number || '',
          license_expiry: data.license_expiry || '',
          id_card_number: data.id_card_number || '',
          id_card_expiry: data.id_card_expiry || '',
          status: data.status || 'available',
          notes: data.notes || '',
        });
        setLoading(false);
      });
  }, [id]);

  const save = async () => {
    if (!form.first_name || !form.phone) { toast.error('Prenom et telephone requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('drivers').update({
      first_name: form.first_name, last_name: form.last_name,
      phone: form.phone, email: form.email || null,
      license_number: form.license_number || null,
      license_expiry: form.license_expiry || null,
      id_card_number: form.id_card_number || null,
      id_card_expiry: form.id_card_expiry || null,
      status: form.status, notes: form.notes || null,
    }).eq('id', id as string);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Modifications enregistrees');
    router.push('/logistics/drivers');
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistics/drivers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors">
          <ArrowLeft size={18}/>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Modifier le chauffeur</h1>
          <p className="text-sm text-muted-foreground">{form.first_name} {form.last_name}</p>
        </div>
      </div>

      <div className={cardCls + ' p-6 space-y-5'}>
        {/* Infos personnelles */}
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

        {/* Documents */}
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

        {/* Statut */}
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

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none w-full'}/>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/logistics/drivers" className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-medium text-center transition-colors">
            Annuler
          </Link>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={16} className="animate-spin"/>Enregistrement...</> : <><Save size={16}/>Enregistrer</>}
          </button>
        </div>
      </div>
    </div>
  );
}
