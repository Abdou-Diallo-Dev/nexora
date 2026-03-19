'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewVehiclePage() {
  const { company, user } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type:'camion', brand:'', model:'', plate:'', year:'', capacity_kg:'', capacity_m3:'', fuel_type:'diesel', consumption_per_km:'', insurance_expiry:'', inspection_expiry:'', notes:'' });
  // plate maps to both 'plate' and 'license_plate' columns
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if (!form.plate) { toast.error('Immatriculation requise'); return; }
    setSaving(true);
    const { error } = await createClient().from('vehicles').insert({
      company_id: company!.id,
      type: form.type, brand: form.brand||null, model: form.model||null,
      plate: form.plate, license_plate: form.plate,
      year: parseInt(form.year)||null,
      capacity_kg: parseFloat(form.capacity_kg)||null,
      capacity_m3: parseFloat(form.capacity_m3)||null,
      fuel_type: form.fuel_type,
      consumption_per_km: parseFloat(form.consumption_per_km)||null,
      insurance_expiry: form.insurance_expiry||null,
      inspection_expiry: form.inspection_expiry||null,
      notes: form.notes||null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Véhicule ajouté !');
    router.push('/logistics/fleet');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/fleet" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors"><ArrowLeft size={18}/></Link>
        <PageHeader title="Nouveau véhicule" subtitle="Ajouter un véhicule à votre flotte"/>
      </div>
      <div className="max-w-2xl">
        <div className={cardCls+' p-6 space-y-4'}>
          <div className="flex items-center gap-2 mb-2"><Truck size={16} className="text-primary"/><h3 className="font-semibold">Informations véhicule</h3></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Type</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)} className={selectCls+' w-full'}>
                <option value="camion">🚛 Camion</option>
                <option value="pickup">🛻 Pickup</option>
                <option value="van">🚐 Van</option>
                <option value="moto">🏍️ Moto</option>
                <option value="autre">🚚 Autre</option>
              </select>
            </div>
            <div><label className={labelCls}>Immatriculation *</label><input value={form.plate} onChange={e=>set('plate',e.target.value)} placeholder="Ex: DK-1234-AB" className={inputCls}/></div>
            <div><label className={labelCls}>Marque</label><input value={form.brand} onChange={e=>set('brand',e.target.value)} placeholder="Ex: Mercedes" className={inputCls}/></div>
            <div><label className={labelCls}>Modèle</label><input value={form.model} onChange={e=>set('model',e.target.value)} placeholder="Ex: Sprinter" className={inputCls}/></div>
            <div><label className={labelCls}>Année</label><input type="number" value={form.year} onChange={e=>set('year',e.target.value)} placeholder="2020" className={inputCls}/></div>
            <div><label className={labelCls}>Carburant</label>
              <select value={form.fuel_type} onChange={e=>set('fuel_type',e.target.value)} className={selectCls+' w-full'}>
                <option value="diesel">Diesel</option>
                <option value="essence">Essence</option>
                <option value="electrique">Électrique</option>
                <option value="hybride">Hybride</option>
              </select>
            </div>
            <div><label className={labelCls}>Capacité (kg)</label><input type="number" value={form.capacity_kg} onChange={e=>set('capacity_kg',e.target.value)} placeholder="1000" className={inputCls}/></div>
            <div><label className={labelCls}>Capacité (m³)</label><input type="number" value={form.capacity_m3} onChange={e=>set('capacity_m3',e.target.value)} placeholder="5" className={inputCls}/></div>
            <div><label className={labelCls}>Conso. (L/100km)</label><input type="number" value={form.consumption_per_km} onChange={e=>set('consumption_per_km',e.target.value)} placeholder="8" className={inputCls}/></div>
            <div><label className={labelCls}>Expiration assurance</label><input type="date" value={form.insurance_expiry} onChange={e=>set('insurance_expiry',e.target.value)} className={inputCls}/></div>
            <div className="col-span-2"><label className={labelCls}>Expiration visite technique</label><input type="date" value={form.inspection_expiry} onChange={e=>set('inspection_expiry',e.target.value)} className={inputCls}/></div>
          </div>
          <div><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} className={inputCls+' resize-none w-full'}/></div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className={btnPrimary+' flex-1 justify-center'}>
              {saving?<LoadingSpinner size={15}/>:<Truck size={15}/>}{saving?'Enregistrement...':'Ajouter le véhicule'}
            </button>
            <Link href="/logistics/fleet" className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}