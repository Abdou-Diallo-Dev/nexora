'use client';
import { useEffect, useState } from 'react';
import { CreditCard, Download, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant, cardCls } from '@/components/ui';
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils';
import { generateReceiptPDF } from '@/lib/pdf';

type Payment = {
  id: string; amount: number; charges_amount: number; status: string;
  period_month: number; period_year: number; payment_method: string;
  paid_date: string | null; due_date: string | null; reference: string | null;
};

type TenantInfo = {
  tenant: { first_name: string; last_name: string; phone: string | null } | null;
  property: { name: string; address: string; city: string; type: string } | null;
  company: { name: string; email: string | null; phone: string | null; address: string | null; logo_url: string | null; primary_color: string | null } | null;
  lease: { rent_amount: number } | null;
};

const STATUS: Record<string, { l: string; v: BadgeVariant; icon: React.ReactNode }> = {
  paid:    { l: 'Payé',       v: 'success', icon: <CheckCircle size={14} /> },
  pending: { l: 'En attente', v: 'warning', icon: <Clock size={14} /> },
  late:    { l: 'En retard',  v: 'error',   icon: <AlertTriangle size={14} /> },
  overdue: { l: 'Impayé',     v: 'error',   icon: <AlertTriangle size={14} /> },
  partial: { l: 'Partiel',    v: 'warning', icon: <Clock size={14} /> },
};

const METHOD: Record<string, string> = {
  cash: 'Espèces', bank_transfer: 'Virement', wave: 'Wave',
  orange_money: 'Orange Money', free_money: 'Free Money', check: 'Chèque',
};

export default function TenantPaymentsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [info, setInfo]           = useState<TenantInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [tab, setTab]             = useState<'all' | 'receipts'>('all');

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }

        const [{ data: pmts }, { data: tenant }, { data: lease }, { data: company }] = await Promise.all([
          sb.from('rent_payments')
            .select('id,amount,charges_amount,status,period_month,period_year,payment_method,paid_date,due_date,reference')
            .eq('company_id', ta.company_id)
            .eq('tenant_id', ta.tenant_id)
            .order('period_year', { ascending: false })
            .order('period_month', { ascending: false }),

          sb.from('tenants')
            .select('first_name,last_name,phone,properties(name,address,city,type)')
            .eq('id', ta.tenant_id)
            .maybeSingle(),

          sb.from('leases')
            .select('rent_amount')
            .eq('tenant_id', ta.tenant_id)
            .eq('status', 'active')
            .maybeSingle(),

          sb.from('companies')
            .select('name,email,phone,address,logo_url,primary_color')
            .eq('id', ta.company_id)
            .maybeSingle(),
        ]);

        setPayments((pmts || []) as Payment[]);
        setInfo({
          tenant: tenant as any,
          property: (tenant as any)?.properties || null,
          company: company as any,
          lease: lease as any,
        });
        setLoading(false);
      });
  }, [user?.id]);

  const downloadReceipt = async (p: Payment) => {
    if (p.status !== 'paid') return;
    setDownloading(p.id);
    try {
      await generateReceiptPDF({
        tenantName:      `${info?.tenant?.first_name || ''} ${info?.tenant?.last_name || ''}`.trim(),
        tenantPhone:     info?.tenant?.phone ?? undefined,
        propertyName:    info?.property?.name || info?.property?.address || '',
        propertyAddress: info?.property?.address || '',
        propertyCity:    info?.property?.city || '',
        propertyType:    info?.property?.type || '',
        amount:          p.amount,
        chargesAmount:   p.charges_amount || 0,
        periodMonth:     p.period_month,
        periodYear:      p.period_year,
        paidDate:        p.paid_date ?? undefined,
        paymentMethod:   p.payment_method,
        reference:       p.reference ?? undefined,
        companyName:     info?.company?.name || '',
        companyPhone:    info?.company?.phone ?? undefined,
        companyEmail:    info?.company?.email ?? undefined,
        companyAddress:  info?.company?.address ?? undefined,
        companyLogoUrl:  info?.company?.logo_url ?? null,
        primaryColor:    info?.company?.primary_color ?? null,
        status:          'paid',
      });
    } catch {}
    setDownloading(null);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

  const paid    = payments.filter(p => p.status === 'paid');
  const pending = payments.filter(p => p.status !== 'paid');
  const displayed = tab === 'receipts' ? paid : payments;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
          <CreditCard size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Paiements & Quittances</h1>
          <p className="text-xs text-muted-foreground">{payments.length} paiement(s)</p>
        </div>
      </div>

      {/* Stats */}
      {info?.lease && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Loyer</p>
            <p className="font-bold text-foreground text-sm">{formatCurrency(info.lease.rent_amount)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Payés</p>
            <p className="font-bold text-green-600 text-sm">{paid.length}</p>
          </div>
          <div className={`rounded-2xl border p-3 text-center ${pending.length > 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-border'}`}>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">En attente</p>
            <p className={`font-bold text-sm ${pending.length > 0 ? 'text-red-600' : 'text-foreground'}`}>{pending.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'all' ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          Tous les paiements
        </button>
        <button
          onClick={() => setTab('receipts')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === 'receipts' ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <FileText size={13} /> Mes quittances ({paid.length})
        </button>
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className={cardCls + ' p-8 text-center text-muted-foreground text-sm'}>
          {tab === 'receipts' ? 'Aucune quittance disponible' : 'Aucun paiement trouvé'}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(p => {
            const st = STATUS[p.status] || { l: p.status, v: 'default' as BadgeVariant, icon: null };
            const isPaid = p.status === 'paid';
            return (
              <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 ${!isPaid ? 'border-amber-200 dark:border-amber-800' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                      {isPaid ? <CheckCircle size={18} className="text-green-600" /> : <Clock size={18} className="text-amber-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{formatMonth(p.period_month, p.period_year)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.amount)}{p.charges_amount > 0 ? ` + ${formatCurrency(p.charges_amount)} charges` : ''}
                      </p>
                      {p.paid_date && (
                        <p className="text-xs text-green-600 mt-0.5">Payé le {formatDate(p.paid_date)} · {METHOD[p.payment_method] || p.payment_method}</p>
                      )}
                      {!isPaid && p.due_date && (
                        <p className="text-xs text-amber-600 mt-0.5">Échéance : {formatDate(p.due_date)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={st.v}>{st.l}</Badge>
                    {isPaid && (
                      <button
                        onClick={() => downloadReceipt(p)}
                        disabled={downloading === p.id}
                        title="Télécharger la quittance PDF"
                        className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 transition-colors disabled:opacity-50"
                      >
                        {downloading === p.id ? <LoadingSpinner size={14} /> : <Download size={15} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}