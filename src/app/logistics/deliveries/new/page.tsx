'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Package, Truck, User, DollarSign, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

type Driver = { id:string; first_name:string; last_name:string; status:string };
type Vehicle = { id:string; plate:string; type:string; capacity_kg:number; status:string };
type Client = { id:string; name:string; phone:string };

const GOODS_TYPES = ['Électronique','Textile','Alimentaire','Construction','Mobilier','Documents','Médicaments','Chimique','Autre'];

export default function NewDeliveryPage() {
  const { company, user } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    client_id: '', driver_id: '', vehicle_id: '',
    pickup_address: '', pickup_city: '', delivery_address: '', delivery_city: '',
    goods_type: '', goods_description: '', weight_kg: '', volume_m3: '',
    priority: 'normal', payment_method: 'cash',
    base_price: '', distance_km: '', notes: '',
    scheduled_at: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate price
  const autoPrice = () => {
    const dist = parseFloat(form.distance_km) || 0;
    const weight = parseFloat(form.weight_kg) || 0;
    const base = dist * 150 + weight * 50;
    const multiplier = form.priority === 'urgent' ? 2 : form.priority === 'express' ? 1.5 : 1;
    return Math.round(base * multiplier);
  };

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('drivers').select('id,first_name,last_name,status').eq('company_id', company.id).eq('status','available').then(({data})=>setDrivers((data||[]) as Driver[]));
    sb.from('vehicles').select('id,plate,type,capacity_kg,status').eq('company_id', company.id).eq('status','available').then(({data})=>setVehicles((data||[]) as Vehicle[]));
    sb.from('logistics_clients').select('id,name,phone').eq('company_id', company.id).order('name').then(({data})=>setClients((data||[]) as Client[]));
  }, [company?.id]);

  const save = async () => {
    if (!form.pickup_address || !form.delivery_address) { toast.error('Adresses requises'); return; }
    setSaving(true);
    const price = parseFloat(form.base_price) || autoPrice();
    const { error } = await createClient().from('deliveries').insert({
      company_id: company!.id,
      client_id: form.client_id || null,
      driver_id: form.driver_id || null,
      vehicle_id: form.vehicle_id || null,
      pickup_address: form.pickup_address, pickup_city: form.pickup_city,
      delivery_address: form.delivery_address, delivery_city: form.delivery_city,
      goods_type: form.goods_type || null, goods_description: form.goods_description || null,
      weight_kg: parseFloat(form.weight_kg) || null,
      volume_m3: parseFloat(form.volume_m3) || null,
      priority: form.priority,
      payment_method: form.payment_method,
      base_price: price, final_price: price,
      distance_km: parseFloat(form.distance_km) || null,
      notes: form.notes || null,
      scheduled_at: form.scheduled_at || null,
      status: form.driver_id ? 'assigned' : 'pending',
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Livraison créée !');
    router.push('/logistics/deliveries');
  };

  const estimatedPrice = autoPrice();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/deliveries" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors">
          <ArrowLeft size={18}/>
        </Link>
        <PageHeader title="Nouvelle livraison" subtitle="Créer une livraison"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Points A → B */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-primary"/>
              <h3 className="font-semibold text-foreground">Itinéraire</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>📍 Adresse de collecte *</label>
                  <input value={form.pickup_address} onChange={e=>set('pickup_address',e.target.value)} placeholder="Ex: 12 Rue Sandaga" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Ville de collecte</label>
                  <input value={form.pickup_city} onChange={e=>set('pickup_city',e.target.value)} placeholder="Ex: Dakar" className={inputCls}/>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>🏁 Adresse de livraison *</label>
                  <input value={form.delivery_address} onChange={e=>set('delivery_address',e.target.value)} placeholder="Ex: 5 Av. Bourguiba" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Ville de livraison</label>
                  <input value={form.delivery_city} onChange={e=>set('delivery_city',e.target.value)} placeholder="Ex: Thiès" className={inputCls}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Distance estimée (km)</label>
                  <input type="number" value={form.distance_km} onChange={e=>set('distance_km',e.target.value)} placeholder="Ex: 45" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Date planifiée</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={e=>set('scheduled_at',e.target.value)} className={inputCls}/>
                </div>
              </div>
            </div>
          </div>

          {/* Marchandise */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-primary"/>
              <h3 className="font-semibold text-foreground">Marchandise</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Type de marchandise</label>
                <select value={form.goods_type} onChange={e=>set('goods_type',e.target.value)} className={selectCls+' w-full'}>
                  <option value="">— Choisir —</option>
                  {GOODS_TYPES.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Priorité</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[{v:'normal',l:'Normal',c:'text-slate-600 border-slate-200'},{v:'express',l:'Express',c:'text-orange-600 border-orange-200'},{v:'urgent',l:'Urgent',c:'text-red-600 border-red-200'}].map(p=>(
                    <button key={p.v} onClick={()=>set('priority',p.v)}
                      className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.priority===p.v?'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary':p.c+' border'}`}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Poids (kg)</label>
                <input type="number" value={form.weight_kg} onChange={e=>set('weight_kg',e.target.value)} placeholder="Ex: 50" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Volume (m³)</label>
                <input type="number" value={form.volume_m3} onChange={e=>set('volume_m3',e.target.value)} placeholder="Ex: 2" className={inputCls}/>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <input value={form.goods_description} onChange={e=>set('goods_description',e.target.value)} placeholder="Ex: 5 cartons de marchandises fragiles" className={inputCls}/>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={cardCls+' p-5'}>
            <label className={labelCls}>Notes / Instructions</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} placeholder="Instructions spéciales pour le chauffeur..." className={inputCls+' resize-none w-full mt-1'}/>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <User size={15} className="text-primary"/>
              <h3 className="font-semibold text-foreground text-sm">Client</h3>
            </div>
            <select value={form.client_id} onChange={e=>set('client_id',e.target.value)} className={selectCls+' w-full'}>
              <option value="">— Choisir un client —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select>
            <Link href="/logistics/clients/new" className="text-xs text-primary hover:underline mt-2 block">+ Nouveau client</Link>
          </div>

          {/* Chauffeur + Véhicule */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <Truck size={15} className="text-primary"/>
              <h3 className="font-semibold text-foreground text-sm">Affectation</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Chauffeur</label>
                <select value={form.driver_id} onChange={e=>set('driver_id',e.target.value)} className={selectCls+' w-full'}>
                  <option value="">— Auto / Non assigné —</option>
                  {drivers.map(d=><option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                </select>
                {drivers.length === 0 && <p className="text-xs text-amber-600 mt-1">Aucun chauffeur disponible</p>}
              </div>
              <div>
                <label className={labelCls}>Véhicule</label>
                <select value={form.vehicle_id} onChange={e=>set('vehicle_id',e.target.value)} className={selectCls+' w-full'}>
                  <option value="">— Choisir —</option>
                  {vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} · {v.type} · {v.capacity_kg}kg</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Prix */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={15} className="text-primary"/>
              <h3 className="font-semibold text-foreground text-sm">Tarification</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Prix (FCFA)</label>
                <input type="number" value={form.base_price} onChange={e=>set('base_price',e.target.value)} placeholder={`Estimé: ${estimatedPrice.toLocaleString()}`} className={inputCls}/>
                <p className="text-xs text-muted-foreground mt-1">Auto-calculé : {estimatedPrice.toLocaleString()} FCFA</p>
              </div>
              <div>
                <label className={labelCls}>Mode de paiement</label>
                <select value={form.payment_method} onChange={e=>set('payment_method',e.target.value)} className={selectCls+' w-full'}>
                  <option value="cash">Espèces</option>
                  <option value="wave">Wave</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="free_money">Free Money</option>
                  <option value="credit">Crédit</option>
                </select>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <button onClick={save} disabled={saving} className={btnPrimary+' w-full justify-center py-3'}>
              {saving ? <LoadingSpinner size={16}/> : <Package size={16}/>}
              {saving ? 'Création...' : 'Créer la livraison'}
            </button>
            <Link href="/logistics/deliveries" className={btnSecondary+' text-center py-3'}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}