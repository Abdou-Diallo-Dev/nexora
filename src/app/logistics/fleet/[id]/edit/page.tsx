'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Truck, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, inputCls, labelCls, selectCls, cardCls } from '@/components/ui';

const VEHICLE_TYPES = [
  { value: 'goder',         label: 'Goder (benne)' },
  { value: 'plateau',       label: 'Plateau' },
  { value: 'citerne',       label: 'Citerne' },
  { value: 'semi_remorque', label: 'Semi-remorque' },
  { value: 'frigorifique',  label: 'Frigorifique' },
  { value: 'fourgon',       label: 'Fourgon' },
  { value: 'pick_up',       label: 'Pick-up' },
  { value: 'moto',          label: 'Moto' },
  { value: 'truck',         label: 'Camion' },
  { value: 'van',           label: 'Van' },
  { value: 'autre',         label: 'Autre (preciser)' },
];

const STATUS_OPTIONS = [
  { value: 'operational', label: 'Operationnel',   dot: '#16a34a' },
  { value: 'maintenance', label: 'En maintenance', dot: '#ea580c' },
  { value: 'panne',       label: 'En panne',       dot: '#dc2626' },
];

type Form = {
  type: string; custom_type: string; status: string;
  brand: string; model: string; plate: string; year: string;
  capacity_kg: string; fuel_type: string;
  insurance_expiry: string; inspection_expiry: string; notes: string;
};

export default function EditVehiculePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    type: 'goder', custom_type: '', status: 'operational',
    brand: '', model: '', plate: '', year: '',
    capacity_kg: '', fuel_type: 'diesel',
    insurance_expiry: '', inspection_expiry: '', notes: '',
  });

  useEffect(() => {
    if (!id || !company?.id) return;
    createClient().from('vehicles').select('*').eq('id', id).eq('company_id', company.id).single()
      .then(({ data: d }) => {
        if (!d) { router.push('/logistics/fleet'); return; }
        setForm({
          type: d.type || 'goder',
          custom_type: d.custom_type || '',
          status: d.status || 'operational',
          brand: d.brand || '',
          model: d.model || '',
          plate: d.plate || d.license_plate || '',
          year: d.year ? String(d.year) : '',
          capacity_kg: d.capacity_kg ? String(d.capacity_kg) : '',
          fuel_type: d.fuel_type || 'diesel',
          insurance_expiry: d.insurance_expiry || '',
          inspection_expiry: d.inspection_expiry || '',
          notes: d.notes || '',
        });
        setLoading(false);
      });
  }, [id, company?.id]);

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.plate) { toast.error('Immatriculation requise'); return; }
    setSaving(true);
    const { error } = await createClient().from('vehicles').update({
      type: form.type,
      custom_type: form.type === 'autre' ? form.custom_type : null,
      status: form.status,
      brand: form.brand || null,
      model: form.model || null,
      plate: form.plate,
      license_plate: form.plate,
      year: parseInt(form.year) || null,
      capacity_kg: parseFloat(form.capacity_kg) || null,
      fuel_type: form.fuel_type,
      insurance_expiry: form.insurance_expiry || null,
      inspection_expiry: form.inspection_expiry || null,
      notes: form.notes || null,
    }).eq('id', id as string);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Modifications enregistrees');
    router.back();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
          <ArrowLeft size={18}/>
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Modifier le vehicule</h1>
          <p className="text-sm text-muted-foreground">{form.plate}</p>
        </div>
      </div>

      <div className={cardCls + ' p-6 space-y-5'}>
        <div className="flex items-center gap-2 mb-1">
          <Truck size={16} className="text-primary"/>
          <h3 className="font-semibold">Informations</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <div className="col-span-2">
            <label className={labelCls}>Type de vehicule</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className={selectCls + ' w-full'}>
              {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {form.type === 'autre' && (
              <input
                value={form.custom_type}
                onChange={e => set('custom_type', e.target.value)}
                placeholder="Precisez le type..."
                className={inputCls + ' mt-2'}
              />
            )}
          </div>

          {/* Statut */}
          <div className="col-span-2">
            <label className={labelCls}>Statut</label>
            <div className="flex gap-2 mt-1">
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
            <label className={labelCls}>Immatriculation *</label>
            <input value={form.plate} onChange={e => set('plate', e.target.value)} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Marque</label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ex: Mercedes" className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Modele</label>
            <input value={form.model} onChange={e => set('model', e.target.value)} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Annee</label>
            <input type="number" value={form.year} onChange={e => set('year', e.target.value)} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Carburant</label>
            <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={selectCls + ' w-full'}>
              <option value="diesel">Diesel</option>
              <option value="essence">Essence</option>
              <option value="electrique">Electrique</option>
              <option value="hybride">Hybride</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Capacite (kg)</label>
            <input type="number" value={form.capacity_kg} onChange={e => set('capacity_kg', e.target.value)} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Expiration assurance</label>
            <input type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Expiration visite technique</label>
            <input type="date" value={form.inspection_expiry} onChange={e => set('inspection_expiry', e.target.value)} className={inputCls}/>
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + ' resize-none w-full'}/>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-medium transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={16} className="animate-spin"/>Enregistrement...</> : <><Save size={16}/>Enregistrer</>}
          </button>
        </div>
      </div>
    </div>
  );
}
