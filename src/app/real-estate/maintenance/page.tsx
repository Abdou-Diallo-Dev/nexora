'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Wrench, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import {
  PageHeader, Badge, LoadingSpinner, EmptyState, Pagination,
  inputCls, selectCls, btnPrimary, cardCls, BadgeVariant,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';

type Ticket = {
  id: string; title: string; category: string; priority: string; status: string;
  scheduled_date: string | null; created_at: string;
  properties: { name: string } | null;
  tenants: { first_name: string; last_name: string } | null;
};

const STATUS_META: Record<string, { l: string; v: BadgeVariant }> = {
  open:        { l: 'Ouvert',    v: 'error'   },
  in_progress: { l: 'En cours',  v: 'warning' },
  resolved:    { l: 'Résolu',    v: 'success' },
  closed:      { l: 'Fermé',     v: 'default' },
};
const PRIORITY_META: Record<string, { l: string; v: BadgeVariant }> = {
  low:    { l: 'Faible', v: 'info'    },
  medium: { l: 'Moyen',  v: 'warning' },
  high:   { l: 'Élevé',  v: 'warning' },
  urgent: { l: 'URGENT', v: 'error'   },
};
const CAT_LABELS: Record<string,string> = {
  plumbing:'Plomberie', electricity:'Électricité', hvac:'Climatisation',
  structural:'Structure', appliance:'Électroménager', pest_control:'Nuisibles', other:'Autre',
};

export default function MaintenancePage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient()
      .from('maintenance_tickets')
      .select('id,title,category,priority,status,scheduled_date,created_at,properties(name),tenants(first_name,last_name)', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    if (filterPriority) q = q.eq('priority', filterPriority);
    if (debounced) q = q.ilike('title', `%${debounced}%`);
    q.then(({ data, count }) => { setItems(data as unknown as Ticket[] || []); setTotal(count || 0); setLoading(false); });
  }, [company?.id, debounced, filterStatus, filterPriority, offset, pageSize]);

  return (
    <div>
      <PageHeader
        title="Tickets de maintenance"
        subtitle={`${total} ticket(s)`}
        actions={
          <Link href="/real-estate/maintenance/new" className={btnPrimary}>
            <Plus size={16} />Nouveau ticket
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls + ' pl-9'} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-36'}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_META).map(([v,{l}]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }} className={selectCls + ' w-32'}>
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY_META).map(([v,{l}]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
        : items.length === 0
          ? <EmptyState icon={<Wrench size={24} />} title="Aucun ticket"
              action={<Link href="/real-estate/maintenance/new" className={btnPrimary}><Plus size={16} />Créer</Link>} />
          : (
            <div className={cardCls}>
              <div className="divide-y divide-border">
                {items.map(t => {
                  const sm = STATUS_META[t.status] || { l: t.status, v: 'default' as BadgeVariant };
                  const pm = PRIORITY_META[t.priority] || { l: t.priority, v: 'default' as BadgeVariant };
                  return (
                    <Link
                      key={t.id}
                      href={`/real-estate/maintenance/${t.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      {/* Priority dot */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        t.priority === 'urgent' ? 'bg-red-500' :
                        t.priority === 'high' ? 'bg-orange-500' :
                        t.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{t.properties?.name || '—'}</span>
                          {t.tenants && (
                            <span className="text-xs text-muted-foreground">
                              · {t.tenants.first_name} {t.tenants.last_name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">· {CAT_LABELS[t.category] || t.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={pm.v}>{pm.l}</Badge>
                        <Badge variant={sm.v}>{sm.l}</Badge>
                        <span className="text-xs text-muted-foreground hidden md:block">{formatDate(t.created_at)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          )}
    </div>
  );
}