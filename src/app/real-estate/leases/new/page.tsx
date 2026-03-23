'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

type Apartment = { id:string; name:string; floor:string; property_id:string; rent_amount:number|null };

export default function NewLeasePage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [props, setProps] = useState<{id:string;name:string}[]>([]);
  const [tenants, setTenants] = useState<{id:string;first_name:string;last_name:string}[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filteredApts, setFilteredApts] = useState<Apartment[]>([]);
  const [form, setForm] = useState({
    property_id:'', apartment_id:'', tenant_id:'',
    start_date:'', end_date:'', rent_amount:'',
    charges_amount:'0', deposit_amount:'', payment_day:'1',
    status:'active', notes:''
  });
  const [loading, setLoading] = useState(false);
  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    Promise.all([
      sb.from('properties').select('id,name').eq('company_id', company.id),
      sb.from('tenants').select('id,first_name,last_name').eq('company_id', company.id).eq('status','active'),
      sb.from('apartments').select('id,name,floor,property_id,rent_amount').eq('company_id', company.id).eq('status','available').order('floor_number').order('name'),
    ]).then(([{data:p},{data:t},{data:a}]) => {
      setProps(p||[]);
      setTenants(t||[]);
      setApartments((a||[]) as Apartment[]);
    });
  }, [company?.id]);

  const handlePropertyChange = (propId: string) => {
    set('property_id', propId);
    set('apartment_id', '');
    const apts = apartments.filter(a => a.property_id === propId);
    setFilteredApts(apts);
  };

  const handleApartmentChange = (aptId: string) => {
    set('apartment_id', aptId);
    // Auto-fill rent amount from apartment
    const apt = apartments.find(a => a.id === aptId);
    if (apt?.rent_amount) set('rent_amount', String(apt.rent_amount));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setLoading(true);
    const { error } = await createClient().from('leases').insert({
      ...form,
      apartment_id: form.apartment_id || null,
      rent_amount: Number(form.rent_amount),
      charges_amount: Number(form.charges_amount),
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null,
      payment_day: Number(form.payment_day),
      company_id: company.id,
    } as never);
    if (!error && form.apartment_id) {
      // Mark apartment as occupied
      await createClient().from('apartments').update({ status:'occupied' }).eq('id', form.apartment_id);
    }
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-');
    toast.success('Bail créé ✓');
    router.push('/real-estate/leases');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/leases" className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link>
        <PageHeader title="Nouveau bail"/>
      </div>
      <form onSubmit={submit} className={cardCls+' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Bien */}
          <div>
            <label className={labelCls}>Bien immobilier *</label>
            <select value={form.property_id} onChange={e=>handlePropertyChange(e.target.value)} required className={selectCls}>
              <option value="">Sélectionner un bien...</option>
              {props.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Appartement */}
          <div>
            <label className={labelCls}>
              Appartement {filteredApts.length > 0 ? '*' : '(optionnel)'}
            </label>
            {filteredApts.length > 0 ? (
              <select value={form.apartment_id} onChange={e=>handleApartmentChange(e.target.value)} className={selectCls}>
                <option value="">— Sélectionner un appartement —</option>
                {filteredApts.map(a=>(
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.floor}{a.rent_amount?` · ${Number(a.rent_amount).toLocaleString()} FCFA`:''}
                  </option>
                ))}
              </select>
            ) : (
              <select value={form.apartment_id} onChange={e=>handleApartmentChange(e.target.value)} className={selectCls}>
                <option value="">— Choisir un bien d'abord —</option>
                {apartments.map(a=>(
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.floor}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Locataire */}
          <div>
            <label className={labelCls}>Locataire *</label>
            <select value={form.tenant_id} onChange={e=>set('tenant_id',e.target.value)} required className={selectCls}>
              <option value="">Sélectionner un locataire...</option>
              {tenants.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>

          <div><label className={labelCls}>Jour de paiement</label>
            <input type="number" min="1" max="31" value={form.payment_day} onChange={e=>set('payment_day',e.target.value)} className={inputCls}/>
          </div>

          <div><label className={labelCls}>Date de début *</label>
            <input type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} required className={inputCls}/>
          </div>
          <div><label className={labelCls}>Date de fin *</label>
            <input type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} required className={inputCls}/>
          </div>

          <div><label className={labelCls}>Loyer mensuel (FCFA) *</label>
            <input type="number" value={form.rent_amount} onChange={e=>set('rent_amount',e.target.value)} required className={inputCls}/>
          </div>
          <div><label className={labelCls}>Charges (FCFA)</label>
            <input type="number" value={form.charges_amount} onChange={e=>set('charges_amount',e.target.value)} className={inputCls}/>
          </div>
          <div><label className={labelCls}>Dépôt de garantie (FCFA)</label>
            <input type="number" value={form.deposit_amount} onChange={e=>set('deposit_amount',e.target.value)} className={inputCls}/>
          </div>

          <div className="md:col-span-2"><label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} className={inputCls}/>
          </div>
        </div>

        {/* Résumé appartement sélectionné */}
        {form.apartment_id && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              🏠 Appartement sélectionné : <strong>{apartments.find(a=>a.id===form.apartment_id)?.name}</strong> — {apartments.find(a=>a.id===form.apartment_id)?.floor}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">Cet appartement sera automatiquement marqué comme "Occupé" à la création du bail.</p>
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/leases" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading?<LoadingSpinner size={16}/>:<Save size={16}/>}Créer le bail
          </button>
        </div>
      </form>
    </div>
  );
}