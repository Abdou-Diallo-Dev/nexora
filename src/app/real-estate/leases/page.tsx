'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate, formatCurrency, isLeaseExpiringSoon, isLeaseExpired } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';

type Lease = { id:string; status:string; start_date:string; end_date:string; rent_amount:number; tenants:{first_name:string;last_name:string}|null; properties:{name:string;address:string}|null };

export default function LeasesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Lease[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { page, pageSize, offset, setPage } = usePagination(15);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('leases')
      .select('id,status,start_date,end_date,rent_amount,tenants(first_name,last_name),properties(name,address)', {count:'exact'})
      .eq('company_id', company.id).order('created_at',{ascending:false}).range(offset,offset+pageSize-1)
      .then(({data,count})=>{setItems((data||[]) as unknown as Lease[]);setTotal(count||0);setLoading(false);});
  }, [company?.id, offset, pageSize]);

  return (
    <div>
      <PageHeader title="Contrats de bail" subtitle={total+' contrat(s)'}
        actions={<Link href="/real-estate/leases/new" className={btnPrimary}><Plus size={16}/>Nouveau bail</Link>}/>
      {loading?<div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
       :items.length===0?<EmptyState icon={<FileText size={24}/>} title="Aucun contrat"
           action={<Link href="/real-estate/leases/new" className={btnPrimary}><Plus size={16}/>Créer</Link>}/>
       :(
        <div className={cardCls}>
          <div className="divide-y divide-border">
            {items.map(l=>{
              const expired=isLeaseExpired(l.end_date);
              const expiring=isLeaseExpiringSoon(l.end_date,60);
              const v: BadgeVariant=l.status==='active'&&!expired?(expiring?'warning':'success'):expired?'error':'default';
              const label=expired?'Expiré':expiring?'Expire bientôt':l.status==='active'?'Actif':'Résilié';
              return(
                <Link key={l.id} href={'/real-estate/leases/'+l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-purple-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{l.tenants?l.tenants.first_name+' '+l.tenants.last_name:'—'}</p>
                    <p className="text-xs text-muted-foreground">{l.properties?.name||'—'} · {formatDate(l.start_date)} → {formatDate(l.end_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(l.rent_amount)}/mois</p>
                    <Badge variant={v}>{label}</Badge>
                  </div>
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
