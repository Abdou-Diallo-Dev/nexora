'use client';
import { useEffect, useState } from 'react';
import { FileText, Plus, Search, Download, Send, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, inputCls, selectCls, btnPrimary, btnSecondary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { usePagination, useSearch } from '@/lib/hooks';
import { can } from '@/lib/permissions';
import { toast } from 'sonner';

type Invoice = {
  id: string; invoice_number: string; type: string; amount: number;
  total_amount: number; status: string; due_date: string|null;
  paid_date: string|null; created_at: string;
  tenants?: { first_name: string; last_name: string }|null;
};

const STATUS_MAP: Record<string,{l:string;v:BadgeVariant}> = {
  draft:     { l:'Brouillon', v:'default' },
  sent:      { l:'Envoyee',   v:'info' },
  paid:      { l:'Payee',     v:'success' },
  overdue:   { l:'En retard', v:'error' },
  cancelled: { l:'Annulee',   v:'default' },
};

const TYPE_MAP: Record<string,string> = {
  rent:'Loyer', deposit:'Caution', charges:'Charges', other:'Autre'
};

export default function InvoicesPage() {
  const { user, company } = useAuthStore();
  const [items, setItems] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [deleting, setDeleting] = useState<string|null>(null);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(20);
  const role = user?.role as any;

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('invoices')
      .select('*,tenants(first_name,last_name)', { count:'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (filterStatus) q = q.eq('status', filterStatus);
    if (debounced) q = q.ilike('invoice_number', '%'+debounced+'%');
    q.then(({ data, count }) => { setItems((data||[]) as Invoice[]); setTotal(count||0); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, debounced, filterStatus, offset]);

  const deleteInvoice = async (id: string) => {
    setDeleting(id);
    await createClient().from('invoices').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Facture supprimee');
    setDeleting(null);
  };

  const markSent = async (id: string) => {
    await createClient().from('invoices').update({ status:'sent' } as never).eq('id', id);
    setItems(prev => prev.map(i => i.id===id ? {...i, status:'sent'} : i));
    toast.success('Facture marquee comme envoyee');
  };

  const markPaid = async (id: string) => {
    await createClient().from('invoices').update({ status:'paid', paid_date: new Date().toISOString().split('T')[0] } as never).eq('id', id);
    setItems(prev => prev.map(i => i.id===id ? {...i, status:'paid'} : i));
    toast.success('Facture marquee comme payee');
  };

  return (
    <div>
      <PageHeader title="Factures" subtitle={total+' facture(s)'}
        actions={can.createInvoice(role) && (
          <button className={btnPrimary}><Plus size={16}/>Nouvelle facture</button>
        )}/>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="N° facture..." className={inputCls+' pl-9'}/>
        </div>
        <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className={selectCls+' w-36'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32}/></div>
        : items.length===0 ? <EmptyState icon={<FileText size={24}/>} title="Aucune facture"/>
        : (
          <div className={cardCls}>
            <div className="hidden md:grid grid-cols-[120px_1fr_100px_120px_100px_120px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>N° Facture</span><span>Locataire</span><span>Type</span><span>Montant</span><span>Statut</span><span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-border">
              {items.map(inv => {
                const sm = STATUS_MAP[inv.status]||{l:inv.status,v:'default' as BadgeVariant};
                const tenant = inv.tenants;
                return (
                  <div key={inv.id} className="grid grid-cols-1 md:grid-cols-[120px_1fr_100px_120px_100px_120px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <span className="font-mono text-xs font-bold text-primary">{inv.invoice_number}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tenant ? tenant.first_name+' '+tenant.last_name : '—'}</p>
                      <p className="text-xs text-muted-foreground">{inv.due_date ? 'Echeance: '+formatDate(inv.due_date) : formatDate(inv.created_at)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{TYPE_MAP[inv.type]||inv.type}</span>
                    <span className="font-semibold text-foreground text-sm">{formatCurrency(inv.total_amount)}</span>
                    <Badge variant={sm.v}>{sm.l}</Badge>
                    <div className="flex items-center gap-1 md:justify-end">
                      {inv.status==='draft' && (
                        <button onClick={()=>markSent(inv.id)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Marquer envoyee">
                          <Send size={14}/>
                        </button>
                      )}
                      {(inv.status==='sent'||inv.status==='overdue') && (
                        <button onClick={()=>markPaid(inv.id)} className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors" title="Marquer payee">
                          <Eye size={14}/>
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-slate-100 transition-colors" title="Telecharger">
                        <Download size={14}/>
                      </button>
                      {can.deleteInvoice(role) && (
                        <button onClick={()=>deleteInvoice(inv.id)} disabled={deleting===inv.id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Supprimer">
                          {deleting===inv.id ? <LoadingSpinner size={14}/> : <Trash2 size={14}/>}
                        </button>
                      )}
                    </div>
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