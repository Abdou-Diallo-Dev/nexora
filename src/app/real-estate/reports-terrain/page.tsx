'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Camera, CheckCircle, Clock, Edit, Trash2, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Report = {
  id:string; type:string; title:string; status:string;
  inspection_date:string; inspector_name:string|null;
  photo_urls:string[]|null; created_at:string;
  properties:{name:string}|null;
  tenants:{first_name:string;last_name:string}|null;
};

const TYPE_MAP: Record<string,{l:string;icon:string;color:string}> = {
  visit:       { l:'Visite terrain',    icon:'🏗️', color:'bg-blue-100 text-blue-700' },
  maintenance: { l:'Suivi travaux',     icon:'🔧', color:'bg-orange-100 text-orange-700' },
  damage:      { l:'Constat',           icon:'⚠️', color:'bg-red-100 text-red-700' },
  entry:       { l:'Etat des lieux E.', icon:'🔑', color:'bg-green-100 text-green-700' },
  exit:        { l:'Etat des lieux S.', icon:'🚪', color:'bg-purple-100 text-purple-700' },
};

const STATUS_MAP: Record<string,{l:string;v:BadgeVariant}> = {
  draft:     { l:'Brouillon',  v:'default' },
  completed: { l:'Complété',   v:'success' },
  signed:    { l:'Signé',      v:'info' },
};

export default function ReportsTerrainPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('property_reports')
      .select('id,type,title,status,inspection_date,inspector_name,photo_urls,created_at,properties(name),tenants(first_name,last_name)', { count:'exact' })
      .eq('company_id', company.id)
      .order('inspection_date', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (filterType) q = q.eq('type', filterType);
    if (filterStatus) q = q.eq('status', filterStatus);
    if (debounced) q = q.ilike('title', `%${debounced}%`);
    q.then(({ data, count }) => { setItems((data||[]) as unknown as Report[]); setTotal(count||0); setLoading(false); });
  };

  useEffect(load, [company?.id, filterType, filterStatus, debounced, offset, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('property_reports').delete().eq('id', deleteId);
    toast.success('Rapport supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  return (
    <div>
      <PageHeader title="Rapports de terrain" subtitle={`${total} rapport(s)`}
        actions={<Link href="/real-estate/reports-terrain/new" className={btnPrimary}><Plus size={16}/>Nouveau rapport</Link>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls+' pl-9'}/>
        </div>
        <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}} className={selectCls+' w-44'}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_MAP).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className={selectCls+' w-36'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32}/></div>
        : items.length===0 ? (
          <EmptyState icon={<FileText size={24}/>} title="Aucun rapport"
            description="Créez votre premier rapport de terrain"
            action={<Link href="/real-estate/reports-terrain/new" className={btnPrimary}><Plus size={16}/>Créer</Link>}
          />
        ) : (
          <div className={cardCls}>
            <div className="divide-y divide-border">
              {items.map(r => {
                const tm = TYPE_MAP[r.type]||{l:r.type,icon:'📄',color:'bg-slate-100 text-slate-700'};
                const sm = STATUS_MAP[r.status]||{l:r.status,v:'default' as BadgeVariant};
                const photoCount = r.photo_urls?.length||0;
                return (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${tm.color}`}>
                      {tm.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{r.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tm.color}`}>{tm.l}</span>
                        {r.properties && <span className="text-xs text-muted-foreground">🏠 {r.properties.name}</span>}
                        {r.inspector_name && <span className="text-xs text-muted-foreground">👤 {r.inspector_name}</span>}
                        <span className="text-xs text-muted-foreground">{formatDate(r.inspection_date)}</span>
                        {photoCount > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Camera size={10}/>{photoCount} photo(s)</span>}
                      </div>
                    </div>
                    <Badge variant={sm.v}>{sm.l}</Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                      <Link href={`/real-estate/reports-terrain/${r.id}`} className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Voir"><Eye size={14}/></Link>
                      <Link href={`/real-estate/reports-terrain/${r.id}?edit=1`} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors" title="Modifier"><Edit size={14}/></Link>
                      <button onClick={()=>setDeleteId(r.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
          </div>
        )}

      <ConfirmDialog open={!!deleteId} title="Supprimer ce rapport ?" description="Action irréversible."
        confirmLabel={deleting?'Suppression...':'Supprimer'} onConfirm={handleDelete} onCancel={()=>setDeleteId(null)}/>
    </div>
  );
}