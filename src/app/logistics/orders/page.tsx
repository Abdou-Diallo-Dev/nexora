'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ShoppingCart, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, inputCls, selectCls, Badge, BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Order = {
  id: string; reference: string; status: string; priority: string;
  pickup_city: string; delivery_city: string;
  amount: number; scheduled_date: string | null; created_at: string;
  logistics_clients: { name: string } | null;
};

const STATUS_MAP: Record<string, { l: string; v: BadgeVariant }> = {
  draft:       { l: 'Brouillon',  v: 'default'  },
  confirmed:   { l: 'Confirmée', v: 'info'     },
  in_progress: { l: 'En cours',  v: 'warning'  },
  completed:   { l: 'Terminée',  v: 'success'  },
  cancelled:   { l: 'Annulée',   v: 'error'    },
};

const PRIORITY_MAP: Record<string, { l: string; color: string }> = {
  normal:  { l: 'Normal',  color: 'text-slate-600'  },
  express: { l: 'Express', color: 'text-orange-600' },
  urgent:  { l: 'URGENT',  color: 'text-red-600'    },
};

export default function OrdersPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient()
      .from('logistics_orders')
      .select('id,reference,status,priority,pickup_city,delivery_city,amount,scheduled_date,created_at,logistics_clients(name)', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus)   q = q.eq('status', filterStatus);
    if (filterPriority) q = q.eq('priority', filterPriority);
    if (debounced)      q = q.ilike('reference', `%${debounced}%`);
    q.then(
      ({ data, count }) => { setItems((data || []) as unknown as Order[]); setTotal(count || 0); setLoading(false); },
      (err: any) => { toast.error('Erreur: ' + (err?.message || 'requête échouée')); setLoading(false); }
    );
  };

  useEffect(load, [company?.id, filterStatus, filterPriority, debounced, offset, pageSize]);

  return (
    <div>
      <PageHeader
        title="Commandes clients"
        subtitle={`${total} commande(s)`}
        actions={<Link href="/logistics/orders/new" className={btnPrimary}><Plus size={16} /> Nouvelle commande</Link>}
      />

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { v: '',            l: 'Toutes'    },
          { v: 'draft',       l: 'Brouillons' },
          { v: 'confirmed',   l: 'Confirmées' },
          { v: 'in_progress', l: 'En cours'   },
          { v: 'completed',   l: 'Terminées'  },
          { v: 'cancelled',   l: 'Annulées'   },
        ].map(s => (
          <button key={s.v} onClick={() => { setFilterStatus(s.v); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterStatus === s.v ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-muted-foreground hover:bg-slate-200'}`}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Référence..." className={inputCls + ' pl-9'} />
        </div>
        <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }} className={selectCls + ' w-36'}>
          <option value="">Toutes priorités</option>
          <option value="normal">Normal</option>
          <option value="express">Express</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {loading
        ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0
          ? <EmptyState icon={<ShoppingCart size={24} />} title="Aucune commande"
              action={<Link href="/logistics/orders/new" className={btnPrimary}><Plus size={16} />Créer</Link>} />
          : (
            <div className={cardCls}>
              <div className="hidden md:grid grid-cols-[1fr_160px_80px_100px_100px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Commande</span><span>Client</span><span>Priorité</span><span>Montant</span><span className="text-right">Statut</span>
              </div>
              <div className="divide-y divide-border">
                {items.map(o => {
                  const sm = STATUS_MAP[o.status]   || { l: o.status, v: 'default' as BadgeVariant };
                  const pm = PRIORITY_MAP[o.priority] || { l: o.priority, color: 'text-slate-600' };
                  return (
                    <Link key={o.id} href={`/logistics/orders/${o.id}`}
                      className="grid grid-cols-1 md:grid-cols-[1fr_160px_80px_100px_100px] gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors items-center">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground">{o.reference}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin size={10} />{o.pickup_city || '?'} → {o.delivery_city || '?'}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{o.logistics_clients?.name || '—'}</span>
                      <span className={`text-xs font-semibold ${pm.color}`}>{pm.l}</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(o.amount || 0)}</span>
                      <div className="md:flex md:justify-end"><Badge variant={sm.v}>{sm.l}</Badge></div>
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
