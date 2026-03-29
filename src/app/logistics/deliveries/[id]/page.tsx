'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Package, Truck, User, Clock, CheckCircle, AlertTriangle, XCircle, Phone, DollarSign, Edit, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant, cardCls, btnPrimary, selectCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Delivery = {
  id:string; reference:string; status:string; priority:string;
  driver_id:string|null; vehicle_id:string|null;
  pickup_address:string; pickup_city:string; pickup_lat:number|null; pickup_lng:number|null;
  delivery_address:string; delivery_city:string; delivery_lat:number|null; delivery_lng:number|null;
  goods_type:string|null; goods_description:string|null;
  weight_kg:number|null; volume_m3:number|null;
  base_price:number; final_price:number; distance_km:number|null;
  payment_method:string|null; payment_status:string;
  scheduled_at:string|null; picked_up_at:string|null; delivered_at:string|null;
  notes:string|null; failure_reason:string|null;
  created_at:string;
  logistics_clients:{id:string;name:string;phone:string|null}|null;
  drivers:{id:string;first_name:string;last_name:string;phone:string|null}|null;
  vehicles:{id:string;plate:string;type:string}|null;
};

const STATUS_FLOW = [
  { key:'pending',     label:'En attente',  icon:<Clock size={16}/>,         color:'text-amber-600',  bg:'bg-amber-50 border-amber-200' },
  { key:'assigned',    label:'Assigné',     icon:<User size={16}/>,           color:'text-blue-600',   bg:'bg-blue-50 border-blue-200' },
  { key:'in_progress', label:'En cours',    icon:<Truck size={16}/>,          color:'text-primary', bg:'bg-primary/10 border-primary/20' },
  { key:'delivered',   label:'Livré ✓',     icon:<CheckCircle size={16}/>,    color:'text-green-600',  bg:'bg-green-50 border-green-200' },
  { key:'failed',      label:'Échec',       icon:<XCircle size={16}/>,        color:'text-red-600',    bg:'bg-red-50 border-red-200' },
  { key:'cancelled',   label:'Annulé',      icon:<AlertTriangle size={16}/>,  color:'text-slate-500',  bg:'bg-slate-50 border-slate-200' },
];

const PRIORITY_MAP: Record<string,{label:string;color:string}> = {
  normal:  { label:'Normal',  color:'text-slate-600 bg-slate-50' },
  express: { label:'Express', color:'text-orange-600 bg-orange-50' },
  urgent:  { label:'URGENT',  color:'text-red-600 bg-red-50' },
};

export default function DeliveryDetailPage() {
  const { company } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [delivery, setDelivery]   = useState<Delivery|null>(null);
  const [loading, setLoading]     = useState(true);
  const [drivers, setDrivers]     = useState<{id:string;first_name:string;last_name:string}[]>([]);
  const [vehicles, setVehicles]   = useState<{id:string;plate:string;type:string}[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [failReason, setFailReason] = useState('');
  const [saving, setSaving]       = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (!company?.id || !id) return;
    const sb = createClient();
    Promise.all([
      sb.from('deliveries').select('*,logistics_clients(id,name,phone),drivers(id,first_name,last_name,phone),vehicles(id,plate,type)').eq('id', id).maybeSingle(),
      sb.from('drivers').select('id,first_name,last_name').eq('company_id', company.id).eq('status','available'),
      sb.from('vehicles').select('id,plate,type').eq('company_id', company.id).eq('status','available'),
    ]).then(([{data:d},{data:dr},{data:v}]) => {
      setDelivery(d as Delivery);
      setNewStatus(d?.status||'');
      setNewDriver(d?.driver_id||'');
      setNewVehicle(d?.vehicle_id||'');
      setDrivers(dr||[]);
      setVehicles(v||[]);
      setLoading(false);
    });
  }, [company?.id, id]);

  const updateStatus = async () => {
    if (!delivery || !newStatus) return;
    setSaving(true);
    const updates: any = { status: newStatus };
    if (newStatus === 'in_progress') updates.picked_up_at = new Date().toISOString();
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();
    if (newStatus === 'failed' && failReason) updates.failure_reason = failReason;
    if (newDriver) updates.driver_id = newDriver;
    if (newVehicle) updates.vehicle_id = newVehicle;
    if (newDriver && newStatus === 'assigned') {
      // Update driver status
      await createClient().from('drivers').update({ status:'on_mission' }).eq('id', newDriver);
      if (delivery.driver_id && delivery.driver_id !== newDriver) {
        await createClient().from('drivers').update({ status:'available' }).eq('id', delivery.driver_id);
      }
    }
    if (newStatus === 'delivered' || newStatus === 'failed' || newStatus === 'cancelled') {
      if (delivery.driver_id) await createClient().from('drivers').update({ status:'available' }).eq('id', delivery.driver_id);
      if (delivery.vehicle_id) await createClient().from('vehicles').update({ status:'available' }).eq('id', delivery.vehicle_id);
      // Update driver stats
      if (newStatus === 'delivered' && delivery.driver_id) {
        const sb = createClient();
        const { data: dr } = await sb.from('drivers').select('total_deliveries,successful_deliveries').eq('id', delivery.driver_id).maybeSingle();
        if (dr) {
          await sb.from('drivers').update({
            total_deliveries: (dr.total_deliveries||0)+1,
            successful_deliveries: (dr.successful_deliveries||0)+1,
          }).eq('id', delivery.driver_id);
        }
      }
    }
    const { error } = await createClient().from('deliveries').update(updates).eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Livraison mise à jour ✓');
    setDelivery(prev => prev ? {...prev, ...updates} : prev);
    setShowStatusModal(false);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={36}/></div>;
  if (!delivery) return <div className="text-center py-16 text-muted-foreground">Livraison introuvable</div>;

  const currentStatus = STATUS_FLOW.find(s => s.key === delivery.status);
  const pm = PRIORITY_MAP[delivery.priority] || PRIORITY_MAP.normal;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/logistics/deliveries" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{delivery.reference}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pm.color}`}>{pm.label}</span>
            {currentStatus && <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${currentStatus.color} ${currentStatus.bg}`}>{currentStatus.icon}{currentStatus.label}</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(delivery.created_at)}</p>
        </div>
        <button onClick={()=>setShowStatusModal(true)} className={btnPrimary}>
          <RefreshCw size={15}/> Changer statut
        </button>
      </div>

      {/* Status flow */}
      <div className={cardCls+' p-4'}>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Progression</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_FLOW.filter(s=>!['cancelled','failed'].includes(s.key)).map((s,i,arr) => {
            const done = ['pending','assigned','in_progress','delivered'].indexOf(delivery.status) >= ['pending','assigned','in_progress','delivered'].indexOf(s.key);
            return (
              <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${done?'bg-primary text-white':'bg-slate-100 dark:bg-slate-700 text-muted-foreground'}`}>
                  {s.icon}{s.label}
                </div>
                {i<arr.length-1 && <div className={`w-4 h-0.5 flex-shrink-0 ${done?'bg-primary':'bg-slate-200'}`}/>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Itinéraire */}
        <div className={cardCls+' p-5'}>
          <div className="flex items-center gap-2 mb-4"><MapPin size={15} className="text-primary"/><h3 className="font-semibold text-foreground">Itinéraire</h3></div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"/></div>
              <div><p className="text-xs text-muted-foreground font-medium">DÉPART</p><p className="font-medium text-foreground text-sm">{delivery.pickup_address}</p>{delivery.pickup_city&&<p className="text-xs text-muted-foreground">{delivery.pickup_city}</p>}</div>
            </div>
            {delivery.distance_km && <div className="flex items-center gap-2 ml-4"><div className="w-0.5 h-6 bg-border"/><span className="text-xs text-muted-foreground ml-1">{delivery.distance_km} km</span></div>}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-full"/></div>
              <div><p className="text-xs text-muted-foreground font-medium">DESTINATION</p><p className="font-medium text-foreground text-sm">{delivery.delivery_address}</p>{delivery.delivery_city&&<p className="text-xs text-muted-foreground">{delivery.delivery_city}</p>}</div>
            </div>
          </div>
        </div>

        {/* Marchandise */}
        <div className={cardCls+' p-5'}>
          <div className="flex items-center gap-2 mb-4"><Package size={15} className="text-primary"/><h3 className="font-semibold text-foreground">Marchandise</h3></div>
          <div className="space-y-2">
            {delivery.goods_type && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span className="font-medium text-foreground">{delivery.goods_type}</span></div>}
            {delivery.goods_description && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Description</span><span className="font-medium text-foreground text-right max-w-[60%]">{delivery.goods_description}</span></div>}
            {delivery.weight_kg && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Poids</span><span className="font-medium text-foreground">{delivery.weight_kg} kg</span></div>}
            {delivery.volume_m3 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Volume</span><span className="font-medium text-foreground">{delivery.volume_m3} m³</span></div>}
            {delivery.scheduled_at && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Planifiée</span><span className="font-medium text-foreground">{formatDate(delivery.scheduled_at)}</span></div>}
            {delivery.notes && <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl text-xs text-muted-foreground">{delivery.notes}</div>}
          </div>
        </div>

        {/* Client */}
        <div className={cardCls+' p-5'}>
          <div className="flex items-center gap-2 mb-4"><User size={15} className="text-primary"/><h3 className="font-semibold text-foreground">Client</h3></div>
          {delivery.logistics_clients ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">{delivery.logistics_clients.name.charAt(0)}</div>
              <div>
                <p className="font-semibold text-foreground">{delivery.logistics_clients.name}</p>
                {delivery.logistics_clients.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10}/>{delivery.logistics_clients.phone}</p>}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Non renseigné</p>}
        </div>

        {/* Chauffeur + Véhicule */}
        <div className={cardCls+' p-5'}>
          <div className="flex items-center gap-2 mb-4"><Truck size={15} className="text-primary"/><h3 className="font-semibold text-foreground">Affectation</h3></div>
          <div className="space-y-3">
            {delivery.drivers ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">{delivery.drivers.first_name.charAt(0)}</div>
                <div>
                  <p className="font-medium text-foreground text-sm">{delivery.drivers.first_name} {delivery.drivers.last_name}</p>
                  {delivery.drivers.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10}/>{delivery.drivers.phone}</p>}
                </div>
              </div>
            ) : <p className="text-sm text-amber-600 flex items-center gap-1.5"><AlertTriangle size={14}/>Aucun chauffeur assigné</p>}
            {delivery.vehicles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck size={14}/>
                <span>{delivery.vehicles.plate} · {delivery.vehicles.type}</span>
              </div>
            ) : <p className="text-sm text-muted-foreground">Aucun véhicule assigné</p>}
          </div>
        </div>

        {/* Finance */}
        <div className={cardCls+' p-5 lg:col-span-2'}>
          <div className="flex items-center gap-2 mb-4"><DollarSign size={15} className="text-primary"/><h3 className="font-semibold text-foreground">Paiement</h3></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-xs text-muted-foreground mb-1">Prix final</p><p className="text-xl font-bold text-foreground">{formatCurrency(delivery.final_price||0)}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Mode</p><p className="font-semibold text-foreground capitalize">{delivery.payment_method||'—'}</p></div>
            <div><p className="text-xs text-muted-foreground mb-1">Statut paiement</p><Badge variant={delivery.payment_status==='paid'?'success':'warning'}>{delivery.payment_status==='paid'?'Payé':'En attente'}</Badge></div>
            {delivery.distance_km && <div><p className="text-xs text-muted-foreground mb-1">Distance</p><p className="font-semibold text-foreground">{delivery.distance_km} km</p></div>}
          </div>
          {delivery.failure_reason && <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-xs font-semibold text-red-700 mb-1">Raison d'échec</p><p className="text-sm text-red-600">{delivery.failure_reason}</p></div>}
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <h3 className="font-bold text-foreground mb-4">Mettre à jour la livraison</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Nouveau statut</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_FLOW.map(s => (
                    <button key={s.key} onClick={()=>setNewStatus(s.key)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${newStatus===s.key?'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary':'border-border text-muted-foreground hover:border-primary/40'}`}>
                      {s.icon}{s.label}
                    </button>
                  ))}
                </div>
              </div>

              {(newStatus==='pending'||newStatus==='assigned'||newStatus==='in_progress') && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Chauffeur</label>
                    <select value={newDriver} onChange={e=>setNewDriver(e.target.value)} className={selectCls+' w-full'}>
                      <option value="">— Garder actuel —</option>
                      {drivers.map(d=><option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Véhicule</label>
                    <select value={newVehicle} onChange={e=>setNewVehicle(e.target.value)} className={selectCls+' w-full'}>
                      <option value="">— Garder actuel —</option>
                      {vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} · {v.type}</option>)}
                    </select>
                  </div>
                </>
              )}

              {newStatus==='failed' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Raison d'échec</label>
                  <textarea value={failReason} onChange={e=>setFailReason(e.target.value)} rows={3} placeholder="Expliquer la raison..." className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowStatusModal(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 transition-colors">Annuler</button>
                <button onClick={updateStatus} disabled={saving} className={btnPrimary+' flex-1 justify-center py-2.5'}>
                  {saving?<LoadingSpinner size={15}/>:<CheckCircle size={15}/>}{saving?'Mise à jour...':'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}