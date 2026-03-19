'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Mail, Phone, Trash2, Edit, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, ConfirmDialog, inputCls, btnPrimary, cardCls } from '@/components/ui';
import { getInitials, formatCurrency } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

type Tenant = { id:string; first_name:string; last_name:string; email:string; phone:string|null; status:string };
type PaymentStatus = { tenant_id:string; status:'ok'|'late'|'pending'|'none'; amount:number; period:string };

function getPaymentBadge(ps: PaymentStatus | undefined) {
  if (!ps || ps.status === 'none') return null;
  if (ps.status === 'ok') return { label:'Payé ✓', color:'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon:<CheckCircle size={11}/> };
  if (ps.status === 'late') return { label:'En retard ⚠️', color:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon:<AlertTriangle size={11}/> };
  if (ps.status === 'pending') return { label:'En attente', color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon:<Clock size={11}/> };
  return null;
}

export default function TenantsPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, PaymentStatus>>({});
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient()
      .from('tenants')
      .select('id,first_name,last_name,email,phone,status', { count:'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (debounced) q = q.or(`first_name.ilike.%${debounced}%,last_name.ilike.%${debounced}%,email.ilike.%${debounced}%`);
    q.then(({ data, count }) => { setItems(data||[]); setTotal(count||0); setLoading(false); });
  };

  // Load payment statuses for current month
  useEffect(() => {
    if (!company?.id) return;
    const now = new Date();
    const month = now.getMonth()+1;
    const year = now.getFullYear();
    const dayOfMonth = now.getDate();

    createClient().from('rent_payments')
      .select('tenant_id,amount,status,period_month,period_year')
      .eq('company_id', company.id)
      .eq('period_month', month)
      .eq('period_year', year)
      .then(({ data }) => {
        const map: Record<string, PaymentStatus> = {};
        (data||[]).forEach((p:any) => {
          let status: PaymentStatus['status'] = 'pending';
          if (p.status === 'paid') status = 'ok';
          else if (p.status === 'late' || p.status === 'overdue' || (p.status === 'pending' && dayOfMonth >= 6)) status = 'late';
          map[p.tenant_id] = { tenant_id:p.tenant_id, status, amount:p.amount, period:`${month}/${year}` };
        });
        setPaymentStatuses(map);
      });
  }, [company?.id]);

  useEffect(load, [company?.id, debounced, offset, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { count } = await createClient().from('leases').select('id', { count:'exact', head:true }).eq('tenant_id', deleteId).eq('status','active');
    if (count && count > 0) { toast.error('Ce locataire a des baux actifs. Résiliez les baux avant de supprimer.'); setDeleting(false); setDeleteId(null); return; }
    const { error } = await createClient().from('tenants').delete().eq('id', deleteId);
    setDeleting(false); setDeleteId(null);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-'); toast.success('Locataire supprimé'); load();
  };

  // Count alerts
  const lateCount = Object.values(paymentStatuses).filter(p => p.status === 'late').length;

  return (
    <div>
      <PageHeader title="Locataires" subtitle={`${total} locataire(s)`}
        actions={<Link href="/real-estate/tenants/new" className={btnPrimary}><Plus size={16}/>Nouveau locataire</Link>}
      />

      {/* Alerte retards */}
      {lateCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3 mb-4">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0"/>
          <p className="text-sm font-semibold text-red-700">
            {lateCount} locataire(s) en retard de paiement ce mois-ci
          </p>
          <Link href="/real-estate/payments" className="ml-auto text-xs text-red-600 font-medium hover:underline flex-shrink-0">
            Voir les paiements →
          </Link>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher par nom, email..." className={inputCls+' pl-9'}/>
      </div>

      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
        : items.length === 0
          ? <EmptyState icon={<Users size={24}/>} title="Aucun locataire" description="Ajoutez votre premier locataire pour commencer" action={<Link href="/real-estate/tenants/new" className={btnPrimary}><Plus size={16}/>Ajouter</Link>}/>
          : (
            <div className={cardCls}>
              <div className="divide-y divide-border">
                {items.map(t => {
                  const ps = paymentStatuses[t.id];
                  const badge = getPaymentBadge(ps);
                  const isLate = ps?.status === 'late';
                  return (
                    <Link key={t.id} href={`/real-estate/tenants/${t.id}`} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group ${isLate ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isLate ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                        {getInitials(`${t.first_name} ${t.last_name}`)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm">{t.first_name} {t.last_name}</p>
                          {isLate && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"/>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {t.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10}/>{t.email}</span>}
                          {t.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10}/>{t.phone}</span>}
                          {ps && ps.amount > 0 && <span className="text-xs text-muted-foreground">{formatCurrency(ps.amount)}</span>}
                        </div>
                      </div>

                      {/* Payment badge */}
                      {badge && (
                        <span className={`hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${badge.color}`}>
                          {badge.icon}{badge.label}
                        </span>
                      )}

                      {/* Status */}
                      <Badge variant={t.status==='active'?'success':'default'}>
                        {t.status==='active'?'Actif':'Inactif'}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/real-estate/tenants/${t.id}/edit`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Modifier">
                          <Edit size={15}/>
                        </Link>
                        <button onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Supprimer">
                          <Trash2 size={15}/>
                        </button>
                      </div>

                      <Link href={`/real-estate/tenants/${t.id}`} onClick={e=>e.stopPropagation()} className="text-xs text-primary hover:underline ml-1 flex-shrink-0">→</Link>
                    </Link>
                  );
                })}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
            </div>
          )
      }

      <ConfirmDialog
        open={!!deleteId} title="Supprimer ce locataire ?"
        description="Cette action est irréversible. Les données associées (hors baux actifs) seront supprimées."
        confirmLabel={deleting?'Suppression...':'Supprimer'}
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}