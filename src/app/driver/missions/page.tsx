'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Package, Clock, CheckCircle, AlertTriangle, LogOut, Navigation, Phone, Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

type Driver = { id:string; first_name:string; last_name:string; status:string; rating:number };
type Mission = {
  id:string; reference:string; status:string; priority:string;
  pickup_address:string; pickup_city:string;
  delivery_address:string; delivery_city:string;
  goods_type:string|null; weight_kg:number|null;
  final_price:number; distance_km:number|null;
  scheduled_at:string|null; notes:string|null;
  logistics_clients:{name:string;phone:string|null}|null;
};

const STATUS_CFG: Record<string,{l:string;color:string;bg:string}> = {
  assigned:    { l:'Assignée',  color:'text-blue-400',   bg:'bg-blue-900/30 border-blue-700' },
  in_progress: { l:'En cours',  color:'text-primary', bg:'bg-primary/10 border-primary/25' },
  delivered:   { l:'Livrée',    color:'text-green-400',  bg:'bg-green-900/30 border-green-700' },
  failed:      { l:'Échec',     color:'text-red-400',    bg:'bg-red-900/30 border-red-700' },
};
const PRIORITY_CFG: Record<string,{l:string;color:string}> = {
  normal:  { l:'Normal',  color:'text-slate-400' },
  express: { l:'Express', color:'text-orange-400' },
  urgent:  { l:'URGENT',  color:'text-red-400' },
};

export default function DriverMissionsPage() {
  const router = useRouter();
  const [driver, setDriver]     = useState<Driver|null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'active'|'done'>('active');
  const [tracking, setTracking] = useState(false);
  const gpsRef = useRef<number|null>(null);

  useEffect(() => {
    const init = async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.replace('/driver/login'); return; }

      const { data: dr } = await sb.from('drivers')
        .select('id,first_name,last_name,status,rating')
        .eq('user_id', session.user.id).maybeSingle();
      if (!dr) { router.replace('/driver/login'); return; }
      setDriver(dr as Driver);

      // Load missions
      const { data: m } = await sb.from('deliveries')
        .select('id,reference,status,priority,pickup_address,pickup_city,delivery_address,delivery_city,goods_type,weight_kg,final_price,distance_km,scheduled_at,notes,logistics_clients(name,phone)')
        .eq('driver_id', dr.id)
        .in('status', ['assigned','in_progress','delivered','failed'])
        .order('created_at', { ascending:false });
      setMissions((m||[]) as unknown as Mission[]);
      setLoading(false);
    };
    init();
  }, []);

  // GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation || !driver) return;
    setTracking(true);
    const sb = createClient();
    gpsRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        await sb.from('drivers').update({
          current_lat: pos.coords.latitude,
          current_lng: pos.coords.longitude,
          last_location_at: new Date().toISOString(),
        }).eq('id', driver.id);
      },
      () => setTracking(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    ) as unknown as number;
  };

  const stopTracking = () => {
    if (gpsRef.current) navigator.geolocation.clearWatch(gpsRef.current);
    setTracking(false);
  };

  const logout = async () => {
    stopTracking();
    await createClient().auth.signOut();
    router.replace('/driver/login');
  };

  const activeMissions = missions.filter(m => ['assigned','in_progress'].includes(m.status));
  const doneMissions   = missions.filter(m => ['delivered','failed'].includes(m.status));
  const displayed = tab === 'active' ? activeMissions : doneMissions;

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <LoadingSpinner size={36}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {driver?.first_name.charAt(0)}{driver?.last_name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-white text-sm">{driver?.first_name} {driver?.last_name}</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${driver?.status==='available'?'bg-green-500 animate-pulse':'bg-amber-500'}`}/>
                <p className="text-xs text-slate-400">⭐ {driver?.rating?.toFixed(1)||'5.0'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={tracking?stopTracking:startTracking}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${tracking?'bg-green-600 text-white':'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              <Navigation size={13}/>{tracking?'GPS actif':'GPS'}
            </button>
            <button onClick={logout} className="p-2 rounded-xl bg-slate-700 text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-slate-700 border-b border-slate-700">
        {[
          { label:'En cours', value: activeMissions.filter(m=>m.status==='in_progress').length, color:'text-primary' },
          { label:'Assignées', value: activeMissions.filter(m=>m.status==='assigned').length, color:'text-blue-400' },
          { label:'Livrées', value: doneMissions.filter(m=>m.status==='delivered').length, color:'text-green-400' },
        ].map((s,i) => (
          <div key={i} className="bg-slate-800 py-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800 border-b border-slate-700">
        <button onClick={()=>setTab('active')} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab==='active'?'text-blue-400 border-b-2 border-blue-400':'text-slate-400'}`}>
          Actives ({activeMissions.length})
        </button>
        <button onClick={()=>setTab('done')} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab==='done'?'text-blue-400 border-b-2 border-blue-400':'text-slate-400'}`}>
          Historique ({doneMissions.length})
        </button>
      </div>

      {/* Missions list */}
      <div className="p-4 space-y-3">
        {displayed.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-slate-400 font-medium">{tab==='active'?'Aucune mission active':'Aucune mission terminée'}</p>
            <p className="text-slate-600 text-sm mt-1">{tab==='active'?'Vous recevrez une notification pour les nouvelles missions':''}</p>
          </div>
        ) : displayed.map(m => {
          const sc = STATUS_CFG[m.status] || STATUS_CFG.assigned;
          const pc = PRIORITY_CFG[m.priority] || PRIORITY_CFG.normal;
          return (
            <Link key={m.id} href={`/driver/mission/${m.id}`}>
              <div className={`rounded-2xl border p-4 ${sc.bg} active:scale-98 transition-transform`}>
                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{m.reference}</span>
                    <span className={`text-xs font-semibold ${pc.color}`}>{pc.l}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.color} ${sc.bg}`}>{sc.l}</span>
                </div>

                {/* Route */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"/>
                    <p className="text-sm text-slate-300 truncate">{m.pickup_address}{m.pickup_city?`, ${m.pickup_city}`:''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"/>
                    <p className="text-sm text-slate-300 truncate">{m.delivery_address}{m.delivery_city?`, ${m.delivery_city}`:''}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {m.distance_km && <span className="text-xs text-slate-500">{m.distance_km} km</span>}
                    {m.goods_type && <span className="text-xs text-slate-500">{m.goods_type}</span>}
                    {m.logistics_clients && <span className="text-xs text-slate-400 flex items-center gap-1"><Package size={10}/>{m.logistics_clients.name}</span>}
                  </div>
                  <span className="text-sm font-bold text-blue-400">{formatCurrency(m.final_price||0)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}