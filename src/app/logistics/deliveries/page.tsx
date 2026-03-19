'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Package, Truck, CheckCircle, Clock, AlertTriangle, X, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, inputCls, selectCls, Badge, BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Delivery = {
  id:string; reference:string; status:string; priority:string;
  pickup_address:string; pickup_city:string;
  delivery_address:string; delivery_city:string;
  final_price:number; distance_km:number;
  created_at:string; scheduled_at:string|null;
  logistics_clients:{name:string}|null;
  drivers:{first_name:string;last_name:string}|null;
  vehicles:{plate:string;type:string}|null;
};

const STATUS_MAP: Record<string,{l:string;v:BadgeVariant;color:string}> = {
  pending:     { l:'En attente',  v:'warning', color:'#f59e0b' },
  assigned:    { l:'Assigné',     v:'info',    color:'#3b82f6' },
  in_progress: { l:'En cours',    v:'info',    color:'#8b5cf6' },
  delivered:   { l:'Livré',       v:'success', color:'#22c55e' },
  failed:      { l:'Échec',       v:'error',   color:'#ef4444' },
  cancelled:   { l:'Annulé',      v:'default', color:'#94a3b8' },
};
const PRIORITY_MAP: Record<string,{l:string;color:string}> = {
  normal:  { l:'Normal',  color:'text-slate-600' },
  express: { l:'Express', color:'text-orange-600' },
  urgent:  { l:'URGENT',  color:'text-red-600' },
};

export default function DeliveriesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('deliveries')
      .select('id,reference,status,priority,pickup_address,pickup_city,delivery_address,delivery_city,final_price,distance_km,created_at,scheduled_at,logistics_clients(name),drivers(first_name,last_name),vehicles(plate,type)', { count:'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (filterStatus) q = q.eq('status', filterStatus);
    if (filterPriority) q = q.eq('priority', filterPriority);
    if (debounced) q = q.ilike('reference', `%${debounced}%`);
    q.then(({ data, count }) => { setItems((data||[]) as unknown as Delivery[]); setTotal(count||0); setLoading(false); });
  };

  useEffect(load, [company?.id, filterStatus, filterPriority, debounced, offset, pageSize]);

  const statusCounts: Record<string,number> = {};
  items.forEach(i => { statusCounts[i.status] = (statusCounts[i.status]||0)+1; });

  return (
    <div>
      <PageHeader title="Livraisons" subtitle={`${total} livraison(s)`}
        actions={<Link href="/logistics/deliveries/new" className={btnPrimary}><Plus size={16}/> Nouvelle livraison</Link>}
      />

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{v:'',l:'Toutes'}, {v:'pending',l:'En attente'}, {v:'assigned',l:'Assignées'}, {v:'in_progress',l:'En cours'}, {v:'delivered',l:'Livrées'}, {v:'failed',l:'Échecs'}].map(s => (
          <button key={s.v} onClick={() => { setFilterStatus(s.v); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterStatus===s.v?'bg-primary text-white':'bg-slate-100 dark:bg-slate-700 text-muted-foreground hover:bg-slate-200'}`}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Référence..." className={inputCls+' pl-9'}/>
        </div>
        <select value={filterPriority} onChange={e=>{setFilterPriority(e.target.value);setPage(1);}} className={selectCls+' w-36'}>
          <option value="">Toutes priorités</option>
          <option value="normal">Normal</option>
          <option value="express">Express</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32}/></div>
        : items.length===0 ? <EmptyState icon={<Package size={24}/>} title="Aucune livraison" action={<Link href="/logistics/deliveries/new" className={btnPrimary}><Plus size={16}/>Créer</Link>}/>
        : (
          <div className={cardCls}>
            <div className="hidden md:grid grid-cols-[1fr_140px_120px_80px_80px_100px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Livraison</span><span>Client</span><span>Chauffeur</span><span>Priorité</span><span>Prix</span><span className="text-right">Statut</span>
            </div>
            <div className="divide-y divide-border">
              {items.map(d => {
                const sm = STATUS_MAP[d.status]||{l:d.status,v:'default' as BadgeVariant,color:'#94a3b8'};
                const pm = PRIORITY_MAP[d.priority]||{l:d.priority,color:'text-slate-600'};
                return (
                  <Link key={d.id} href={`/logistics/deliveries/${d.id}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_80px_80px_100px] gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{d.reference}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin size={10}/>{d.pickup_city||'?'} → {d.delivery_city||'?'}
                        {d.distance_km && <span>· {d.distance_km} km</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{d.logistics_clients?.name||'—'}</span>
                    <span className="text-xs text-muted-foreground truncate">{d.drivers?`${d.drivers.first_name} ${d.drivers.last_name}`:'Non assigné'}</span>
                    <span className={`text-xs font-semibold ${pm.color}`}>{pm.l}</span>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(d.final_price||0)}</span>
                    <div className="md:flex md:justify-end"><Badge variant={sm.v}>{sm.l}</Badge></div>
                  </Link>
                );
              })}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
          </div>
        )}
    </div>
  );
}