'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Phone, Mail, Building2, User, Edit, Trash2, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, inputCls, selectCls, Badge, ConfirmDialog } from '@/components/ui';
import { formatCurrency, getInitials } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Client = { id:string; name:string; phone:string|null; email:string|null; type:string; city:string|null; total_orders:number; credit_balance:number; rating:number; created_at:string };

const TYPE_MAP: Record<string,{l:string;color:string}> = {
  particulier: { l:'Particulier',  color:'bg-slate-100 text-slate-700' },
  entreprise:  { l:'Entreprise',   color:'bg-blue-100 text-blue-700' },
  btp:         { l:'BTP',          color:'bg-orange-100 text-orange-700' },
  commerce:    { l:'Commerce',     color:'bg-green-100 text-green-700' },
  industrie:   { l:'Industrie',    color:'bg-purple-100 text-purple-700' },
};

export default function LogisticsClientsPage() {
  const { company } = useAuthStore();
  const [items, setItems]       = useState<Client[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [filterType, setFilterType] = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('logistics_clients')
      .select('id,name,phone,email,type,city,total_orders,credit_balance,rating,created_at', { count:'exact' })
      .eq('company_id', company.id).order('created_at', { ascending:false }).range(offset, offset+pageSize-1);
    if (filterType) q = q.eq('type', filterType);
    if (debounced) q = q.ilike('name', `%${debounced}%`);
    q.then(
      ({ data, count }) => { setItems((data||[]) as Client[]); setTotal(count||0); setLoading(false); },
      (err: any) => { console.error('Erreur clients:', err); toast.error('Erreur: ' + (err?.message || 'requête échouée')); setLoading(false); }
    );
  };

  useEffect(load, [company?.id, filterType, debounced, offset, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('logistics_clients').delete().eq('id', deleteId);
    toast.success('Client supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${total} client(s) logistique`}
        actions={<Link href="/logistics/clients/new" className={btnPrimary}><Plus size={16}/>Nouveau client</Link>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls+' pl-9'}/>
        </div>
        <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}} className={selectCls+' w-40'}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_MAP).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32}/></div>
        : items.length===0 ? <EmptyState icon={<User size={24}/>} title="Aucun client" action={<Link href="/logistics/clients/new" className={btnPrimary}><Plus size={16}/>Ajouter</Link>}/>
        : (
          <div className={cardCls}>
            <div className="divide-y divide-border">
              {items.map(c => {
                const tm = TYPE_MAP[c.type]||{l:c.type,color:'bg-slate-100 text-slate-700'};
                return (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">{getInitials(c.name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{c.name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tm.color}`}>{tm.l}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10}/>{c.phone}</span>}
                        {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10}/>{c.email}</span>}
                        {c.city && <span className="text-xs text-muted-foreground">{c.city}</span>}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{c.total_orders} commandes</p>
                      {c.credit_balance > 0 && <p className="text-xs text-amber-600 font-medium">{formatCurrency(c.credit_balance)} crédit</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/logistics/clients/${c.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors"><Edit size={14}/></Link>
                      <button onClick={()=>setDeleteId(c.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
          </div>
        )}
      <ConfirmDialog open={!!deleteId} title="Supprimer ce client ?" description="Action irréversible."
        confirmLabel={deleting?'Suppression...':'Supprimer'} onConfirm={handleDelete} onCancel={()=>setDeleteId(null)}/>
    </div>
  );
}