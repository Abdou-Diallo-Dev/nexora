'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileDown, CreditCard, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import {
  PageHeader, Badge, LoadingSpinner, EmptyState, Pagination,
  inputCls, selectCls, btnPrimary, cardCls, BadgeVariant,
} from '@/components/ui';
import { formatDate, formatCurrency, formatMonth } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { generateReceiptPDF } from '@/lib/pdf';
import { toast } from 'sonner';

type Payment = {
  id: string; amount: number; charges_amount: number; period_month: number; period_year: number;
  paid_date: string | null; due_date: string | null; status: string; payment_method: string;
  reference: string | null;
  leases: { start_date: string; tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null; properties: { name: string; address: string; city: string; type: string } | null } | null;
};

const STATUS: Record<string,{l:string;v:BadgeVariant}> = {
  paid:    { l:'Payé',        v:'success'  },
  pending: { l:'En attente',  v:'warning'  },
  late:    { l:'En retard',   v:'error'    },
  partial: { l:'Partiel',     v:'warning'  },
  overdue: { l:'Impayé',      v:'error'    },
};
const METHOD: Record<string,string> = {
  cash:'Espèces', bank_transfer:'Virement', wave:'Wave',
  orange_money:'Orange Money', free_money:'Free Money', check:'Chèque',
};

export default function PaymentsPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient()
      .from('rent_payments')
      .select('*,leases(start_date,tenants(first_name,last_name,email,phone),properties(name,address,city,type))', { count: 'exact' })
      .eq('company_id', company.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(({ data, count }) => { setItems(data as unknown as Payment[] || []); setTotal(count || 0); setLoading(false); });
  }, [company?.id, debounced, filterStatus, offset, pageSize]);

  const handleGeneratePDF = async (p: Payment) => {
    const tenant = p.leases?.tenants;
    const prop = p.leases?.properties;
    if (!tenant || !prop) { toast.error('Données incomplètes'); return; }
    setGeneratingId(p.id);
    try {
      await generateReceiptPDF({
        reference:       p.reference ?? `QUITT-${p.period_year}${String(p.period_month).padStart(2,'0')}`,
        tenantName:      `${tenant.first_name} ${tenant.last_name}`,
        tenantPhone:     tenant.phone    ?? undefined,
        tenantEmail:     tenant.email,
        propertyName:    prop.name,
        propertyAddress: prop.address,
        propertyCity:    prop.city,
        propertyType:    prop.type,
        periodMonth:     p.period_month,
        periodYear:      p.period_year,
        amount:          Number(p.amount) || 0,
        chargesAmount:   Number(p.charges_amount) || 0,
        paidDate:        p.paid_date     ?? undefined,
        paymentMethod:   p.payment_method,
        status:          p.status,
        companyName:     company?.name   || 'Nexora',
        companyAddress:  (company as any)?.address || undefined,
        companyPhone:    (company as any)?.phone   || undefined,
        companyEmail:    (company as any)?.email   || undefined,
        companyLogoUrl:  company?.logo_url || null,
        primaryColor:    (company as any)?.primary_color || null,
        prorataStartDay: p.leases?.start_date ? (() => {
          const startDate = new Date(p.leases!.start_date);
          const isFirstMonth = startDate.getFullYear() === p.period_year && (startDate.getMonth() + 1) === p.period_month;
          return isFirstMonth ? startDate.getDate() : undefined;
        })() : undefined,
      });
      toast.success('Quittance téléchargée');
    } catch { toast.error('Erreur génération PDF'); }
    setGeneratingId(null);
  };

  return (
    <div>
      <PageHeader
        title="Paiements de loyers"
        subtitle={`${total} paiement(s)`}
        actions={
          <Link href="/real-estate/payments/new" className={btnPrimary}>
            <Plus size={16} />Enregistrer
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
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-40'}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS).map(([v,{l}]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
        : items.length === 0
          ? <EmptyState icon={<CreditCard size={24} />} title="Aucun paiement"
              action={<Link href="/real-estate/payments/new" className={btnPrimary}><Plus size={16} />Enregistrer</Link>} />
          : (
            <div className={cardCls}>
              {/* Header */}
              <div className="hidden md:grid grid-cols-[1fr_1fr_100px_110px_90px_100px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Locataire / Bien</span><span>Période</span><span>Montant</span>
                <span>Méthode</span><span>Statut</span><span className="text-right">Quittance</span>
              </div>
              <div className="divide-y divide-border">
                {items.map(p => {
                  const tenant = p.leases?.tenants;
                  const prop = p.leases?.properties;
                  const st = STATUS[p.status] || { l: p.status, v: 'default' as BadgeVariant };
                  return (
                    <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_110px_90px_100px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div>
                        <p className="font-medium text-foreground text-sm">{tenant ? `${tenant.first_name} ${tenant.last_name}` : '—'}</p>
                        <p className="text-xs text-muted-foreground">{prop?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{formatMonth(p.period_month, p.period_year)}</p>
                        {p.paid_date && <p className="text-xs text-muted-foreground">Payé le {formatDate(p.paid_date)}</p>}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{formatCurrency(p.amount)}</p>
                        {p.charges_amount > 0 && <p className="text-xs text-muted-foreground">+{formatCurrency(p.charges_amount)} charges</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">{METHOD[p.payment_method] || p.payment_method}</span>
                      <Badge variant={st.v}>{st.l}</Badge>
                      <div className="md:text-right">
                        <button
                          onClick={() => handleGeneratePDF(p)}
                          disabled={generatingId === p.id}
                          title="Générer la quittance PDF"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          {generatingId === p.id ? <LoadingSpinner size={12} /> : <FileDown size={13} />}
                          Quittance
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          )}
    </div>
  );
}