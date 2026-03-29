'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate, formatCurrency, isLeaseExpiringSoon, isLeaseExpired } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Lease = {
  id: string; status: string; start_date: string; end_date: string;
  rent_amount: number;
  tenants: { first_name: string; last_name: string } | null;
  properties: { name: string; address: string } | null;
};

export default function LeasesPage() {
  const { company, user } = useAuthStore();
  const [items, setItems]       = useState<Lease[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { page, pageSize, offset, setPage } = usePagination(15);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('leases')
      .select('id,status,start_date,end_date,rent_amount,tenants(first_name,last_name),properties(name,address)', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .then(({ data, count }) => {
        setItems((data || []) as unknown as Lease[]);
        setTotal(count || 0);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [company?.id, offset, pageSize]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const sb = createClient();
      // Delete related rent_payments first
      await sb.from('rent_payments').delete().eq('lease_id', id);
      const { error } = await sb.from('leases').delete().eq('id', id);
      if (error) throw error;
      toast.success('Bail supprimé');
      setConfirmId(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erreur suppression');
    }
    setDeleting(null);
  };

  return (
    <div>
      <PageHeader title="Contrats de bail" subtitle={total + ' contrat(s)'}
        actions={<Link href="/real-estate/leases/new" className={btnPrimary}><Plus size={16}/>Nouveau bail</Link>}/>

      {/* Modal confirmation suppression */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600"/>
              </div>
              <div>
                <p className="font-bold text-foreground">Supprimer ce bail ?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cette action supprimera aussi tous les paiements associés.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(confirmId)} disabled={!!deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting === confirmId ? <LoadingSpinner size={14}/> : <Trash2 size={14}/>}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
      ) : items.length === 0 ? (
        <EmptyState icon={<FileText size={24}/>} title="Aucun contrat"
          action={<Link href="/real-estate/leases/new" className={btnPrimary}><Plus size={16}/>Créer</Link>}/>
      ) : (
        <div className={cardCls}>
          <div className="divide-y divide-border">
            {items.map(l => {
              const expired  = isLeaseExpired(l.end_date);
              const expiring = isLeaseExpiringSoon(l.end_date, 60);
              const v: BadgeVariant = l.status === 'active' && !expired ? (expiring ? 'warning' : 'success') : expired ? 'error' : 'default';
              const label = expired ? 'Expiré' : expiring ? 'Expire bientôt' : l.status === 'active' ? 'Actif' : 'Résilié';
              return (
                <div key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <Link href={'/real-estate/leases/' + l.id} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-primary"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        {l.tenants ? l.tenants.first_name + ' ' + l.tenants.last_name : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {l.properties?.name || '—'} · {formatDate(l.start_date)} → {formatDate(l.end_date)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(l.rent_amount)}/mois</p>
                      <Badge variant={v}>{label}</Badge>
                    </div>
                  </Link>
                  {isAdmin && (
                    <button onClick={() => setConfirmId(l.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <Trash2 size={15}/>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
        </div>
      )}
    </div>
  );
}