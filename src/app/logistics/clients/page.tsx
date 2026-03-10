'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Search, Mail, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, inputCls, btnPrimary, cardCls } from '@/components/ui';
import { getInitials } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';

type Client = { id: string; name: string; email: string | null; phone: string | null; city: string | null };

export default function ClientsPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('clients').select('id,name,email,phone,city', { count: 'exact' })
      .eq('company_id', company.id).order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
    if (debounced) q = q.or('name.ilike.%' + debounced + '%,email.ilike.%' + debounced + '%');
    q.then(({ data, count }) => { setItems(data || []); setTotal(count || 0); setLoading(false); });
  }, [company?.id, debounced, offset, pageSize]);

  return (
    <div>
      <PageHeader title="Clients" subtitle={total + ' client(s)'}
        actions={<Link href="/logistics/clients/new" className={btnPrimary}><Plus size={16} />Nouveau client</Link>} />
      <div className="mb-4 relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls + ' pl-9'} />
      </div>
      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
        : items.length === 0
          ? <EmptyState icon={<Users size={24} />} title="Aucun client" action={<Link href="/logistics/clients/new" className={btnPrimary}><Plus size={16} />Ajouter</Link>} />
          : (
            <div className={cardCls}>
              <div className="divide-y divide-border">
                {items.map(c => (
                  <Link key={c.id} href={'/logistics/clients/' + c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-sm">{getInitials(c.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{c.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                        {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                      </div>
                    </div>
                    {c.city && <span className="text-xs text-muted-foreground hidden md:block">{c.city}</span>}
                  </Link>
                ))}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          )}
    </div>
  );
}
