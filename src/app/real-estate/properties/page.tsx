'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Building2, MapPin, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, inputCls, btnPrimary, cardCls, BadgeVariant } from '@/components/ui';
import { formatCurrency, getPropertyTypeLabel } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';

type Property = { id: string; name: string; address: string; city: string; type: string; status: string; rent_amount: number; rooms_count: number | null; image_urls: string[] | null };

const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  available:   { label: 'Disponible',  variant: 'success' },
  rented:      { label: 'Loué',        variant: 'info'    },
  maintenance: { label: 'Maintenance', variant: 'warning' },
  inactive:    { label: 'Inactif',     variant: 'default' },
};

export default function PropertiesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(12);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient()
      .from('properties')
      .select('id,name,address,city,type,status,rent_amount,rooms_count,image_urls', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (debounced) q = q.or('name.ilike.%' + debounced + '%,address.ilike.%' + debounced + '%,city.ilike.%' + debounced + '%');
    q.then(({ data, count }) => { setItems(data || []); setTotal(count || 0); setLoading(false); });
  }, [company?.id, debounced, offset, pageSize]);

  return (
    <div>
      <PageHeader title="Biens immobiliers" subtitle={total + ' bien(s) enregistré(s)'}
        actions={<Link href="/real-estate/properties/new" className={btnPrimary}><Plus size={16} />Ajouter un bien</Link>} />
      <div className="mb-4 relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls + ' pl-9'} />
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Building2 size={24} />} title="Aucun bien" description="Ajoutez votre premier bien immobilier"
          action={<Link href="/real-estate/properties/new" className={btnPrimary}><Plus size={16} />Ajouter</Link>} />
      ) : (
        <div className={cardCls}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {items.map((p, idx) => {
              const st = STATUS[p.status] || { label: p.status, variant: 'default' as BadgeVariant };
              const firstImage = p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null;
              return (
                <Link key={p.id} href={'/real-estate/properties/' + p.id}
                  className={'flex flex-col border-b border-border hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors overflow-hidden' +
                    (idx % 3 !== 2 ? ' md:border-r' : '')}>
                  
                  {/* Image ou placeholder */}
                  <div className="relative w-full h-44 bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                    {firstImage ? (
                      <img src={firstImage} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home size={32} className="text-slate-300 dark:text-slate-500" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    {p.image_urls && p.image_urls.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                        +{p.image_urls.length - 1} photos
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="p-4 flex flex-col gap-2">
                    <p className="font-semibold text-foreground text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={11} />{p.address}, {p.city}</p>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">{getPropertyTypeLabel(p.type)}{p.rooms_count ? ' · ' + p.rooms_count + ' pièces' : ''}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(p.rent_amount)}/mois</span>
                    </div>
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