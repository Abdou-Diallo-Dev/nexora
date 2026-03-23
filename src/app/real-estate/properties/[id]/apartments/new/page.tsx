'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

export default function NewApartmentPage() {
  const { company } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const propertyId = params?.id as string;
  const [saving, setSaving] = useState(false);
  const [propertyName, setPropertyName] = useState('');
  const [form, setForm] = useState({
    name:'', floor:'RDC', floor_number:0,
    rooms_count:1, surface_m2:'', rent_amount:'',
    status:'available', notes:'',
  });
  const set = (k:string, v:string|number) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!propertyId) return;
    createClient().from('properties').select('name').eq('id', propertyId).maybeSingle()
      .then(({data})=>setPropertyName(data?.name||''));
  }, [propertyId]);

  const FLOORS = [
    { v:'RDC', n:0 },
    ...Array.from({length:10},(_,i)=>({v:`R+${i+1}`,n:i+1})),
  ];

  const save = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('apartments').insert({
      company_id: company!.id, property_id: propertyId,
      name: form.name, floor: form.floor, floor_number: form.floor_number,
      rooms_count: Number(form.rooms_count),
      surface_m2: form.surface_m2 ? Number(form.surface_m2) : null,
      rent_amount: form.rent_amount ? Number(form.rent_amount) : null,
      status: form.status, notes: form.notes||null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Appartement créé ✓');
    router.push(`/real-estate/properties/${propertyId}/apartments`);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/real-estate/properties/${propertyId}/apartments`} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <PageHeader title="Nouvel appartement" subtitle={propertyName}/>
      </div>
      <div className="max-w-2xl">
        <div className={cardCls+' p-6 space-y-4'}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nom de l'appartement *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ex: ONCAD 1A" className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Niveau / Étage</label>
              <select value={form.floor} onChange={e=>{
                const f = FLOORS.find(f=>f.v===e.target.value);
                setForm(prev=>({...prev, floor:e.target.value, floor_number:f?.n||0}));
              }} className={selectCls+' w-full'}>
                {FLOORS.map(f=><option key={f.v} value={f.v}>{f.v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={form.status} onChange={e=>set('status',e.target.value)} className={selectCls+' w-full'}>
                <option value="available">Disponible</option>
                <option value="occupied">Occupé</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Nombre de pièces</label>
              <input type="number" value={form.rooms_count} onChange={e=>set('rooms_count',e.target.value)} min={1} className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Surface (m²)</label>
              <input type="number" value={form.surface_m2} onChange={e=>set('surface_m2',e.target.value)} placeholder="Ex: 45" className={inputCls}/>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Loyer mensuel (FCFA)</label>
              <input type="number" value={form.rent_amount} onChange={e=>set('rent_amount',e.target.value)} placeholder="Ex: 150000" className={inputCls}/>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} className={inputCls+' resize-none w-full'}/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className={btnPrimary+' flex-1 justify-center'}>
              {saving?<LoadingSpinner size={15}/>:null}{saving?'Création...':'Créer l\'appartement'}
            </button>
            <Link href={`/real-estate/properties/${propertyId}/apartments`} className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}