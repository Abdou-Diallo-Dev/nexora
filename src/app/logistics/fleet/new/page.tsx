'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

const VEHICLE_TYPES = [
  { value: 'goder',         label: 'Goder (benne)' },
  { value: 'plateau',       label: 'Plateau' },
  { value: 'citerne',       label: 'Citerne' },
  { value: 'semi_remorque', label: 'Semi-remorque' },
  { value: 'frigorifique',  label: 'Frigorifique' },
  { value: 'fourgon',       label: 'Fourgon' },
  { value: 'pick_up',       label: 'Pick-up' },
  { value: 'moto',          label: 'Moto' },
  { value: 'autre',         label: 'Autre (préciser)' },
];

const STATUS_OPTIONS = [
  { value: 'operational', label: 'Opérationnel', dot: '#16a34a' },
  { value: 'maintenance', label: 'En maintenance', dot: '#ea580c' },
  { value: 'panne',       label: 'En panne',       dot: '#dc2626' },
];

export default function NewVehiclePage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'goder', custom_type: '', status: 'operational',
    brand: '', model: '', plate: '', year: '',
    capacity_kg: '', capacity_m3: '',
    fuel_type: 'diesel', consumption_per_km: '',
    insurance_expiry: '', inspection_expiry: '', notes: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.plate) { toast.error('Immatriculation requise'); return; }
    if (form.type === 'autre' && !form.custom_type) { toast.error('Précisez le type de véhicule'); return; }
    setSaving(true);
    const { error } = await createClient().from('vehicles').insert({
      company_id: company!.id,
      type: form.type,
      custom_type: form.type === 'autre' ? form.custom_type : null,
      status: form.status,
      brand: form.brand || null, model: form.model || null,
      plate: form.plate, license_plate: form.plate,
      year: parseInt(form.year) || null,
      capacity_kg: parseFloat(form.capacity_kg) || null,
      capacity_m3: parseFloat(form.capacity_m3) || null,
      fuel_type: form.fuel_type,
      consumption_per_km: parseFloat(form.consumption_per_km) || null,
      insurance_expiry: form.insurance_expiry || null,
      inspection_expiry: form.inspection_expiry || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Véhicule ajouté !');
    router.push('/logistics/fleet');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/fleet" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors">
          <ArrowLeft size={18}/>
        </Link>
        <PageHeader title="Nouveau véhicule" subtitle="Ajouter un véhicule à votre flotte"/>
      </div>

      <div className="max-w-2xl">
        <div className={cardCls + ' p-6 space-y-5'}>
          <div className="flex items-center gap-2 mb-1">
            <Truck size={16} className="text-primary"/>
            <h3 className="font-semibold">Informations véhicule</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="col-span-2">
              <label className={labelCls}>Type de véhicule *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={selectCls + ' w-full'}>
                {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {form.type === 'autre' && (
                <input
                  value={form.custom_type}
                  onChange={e => set('custom_type', e.target.value)}
                  placeholder="Précisez le type (ex: bétonnière, porte-engins…)"
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
              <input value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="Ex: DK-1234-AB" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Marque</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Ex: Mercedes" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Modèle</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Ex: Actros" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Année</label>
              <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2020" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Carburant</label>
              <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={selectCls + ' w-full'}>
                <option value="diesel">Diesel</option>
                <option value="essence">Essence</option>
                <option value="electrique">Électrique</option>
                <option value="hybride">Hybride</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Capacité (kg)</label>
              <input type="number" value={form.capacity_kg} onChange={e => set('capacity_kg', e.target.value)} placeholder="10000" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Capacité (m³)</label>
              <input type="number" value={form.capacity_m3} onChange={e => set('capacity_m3', e.target.value)} placeholder="20" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Conso. (L/100km)</label>
              <input type="number" value={form.consumption_per_km} onChange={e => set('consumption_per_km', e.target.value)} placeholder="30" className={inputCls}/>
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
            <button onClick={save} disabled={saving} className={btnPrimary + ' flex-1 justify-center'}>
              {saving ? <LoadingSpinner size={15}/> : <Truck size={15}/>}
              {saving ? 'Enregistrement...' : 'Ajouter le véhicule'}
            </button>
            <Link href="/logistics/fleet" className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
