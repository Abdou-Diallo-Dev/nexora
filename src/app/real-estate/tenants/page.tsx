'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Mail, Phone, Trash2, Edit } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import {
  PageHeader, Badge, LoadingSpinner, EmptyState, Pagination,
  ConfirmDialog, inputCls, btnPrimary, cardCls,
} from '@/components/ui';
import { getInitials } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

type Tenant = { id: string; first_name: string; last_name: string; email: string; phone: string | null; status: string };

export default function TenantsPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient()
      .from('tenants')
      .select('id,first_name,last_name,email,phone,status', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (debounced) q = q.or(`first_name.ilike.%${debounced}%,last_name.ilike.%${debounced}%,email.ilike.%${debounced}%`);
    q.then(({ data, count }) => { setItems(data || []); setTotal(count || 0); setLoading(false); });
  };

  useEffect(load, [company?.id, debounced, offset, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    // Check active leases first
    const { count } = await createClient()
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', deleteId)
      .eq('status', 'active');
    if (count && count > 0) {
      toast.error('Ce locataire a des baux actifs. Résiliez les baux avant de supprimer.');
      setDeleting(false);
      setDeleteId(null);
      return;
    }
    const { error } = await createClient().from('tenants').delete().eq('id', deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-');
    toast.success('Locataire supprimé');
    load();
  };

  return (
    <div>
      <PageHeader
        title="Locataires"
        subtitle={`${total} locataire(s)`}
        actions={
          <Link href="/real-estate/tenants/new" className={btnPrimary}>
            <Plus size={16} />Nouveau locataire
          </Link>
        }
      />

      <div className="mb-4 relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher par nom, email..."
          className={inputCls + ' pl-9'}
        />
      </div>

      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
        : items.length === 0
          ? (
            <EmptyState
              icon={<Users size={24} />}
              title="Aucun locataire"
              description="Ajoutez votre premier locataire pour commencer"
              action={<Link href="/real-estate/tenants/new" className={btnPrimary}><Plus size={16} />Ajouter</Link>}
            />
          ) : (
            <div className={cardCls}>
              <div className="divide-y divide-border">
                {items.map(t => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {getInitials(`${t.first_name} ${t.last_name}`)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{t.first_name} {t.last_name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {t.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail size={10} />{t.email}
                          </span>
                        )}
                        {t.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone size={10} />{t.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <Badge variant={t.status === 'active' ? 'success' : 'default'}>
                      {t.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/real-estate/tenants/${t.id}/edit`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Modifier"
                      >
                        <Edit size={15} />
                      </Link>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Detail link */}
                    <Link
                      href={`/real-estate/tenants/${t.id}`}
                      className="text-xs text-primary hover:underline ml-1 hidden sm:block"
                    >
                      Voir
                    </Link>
                  </div>
                ))}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          )}

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer ce locataire ?"
        description="Cette action est irréversible. Les données associées (hors baux actifs) seront supprimées."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}