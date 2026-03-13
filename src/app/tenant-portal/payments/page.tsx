'use client';
import { useEffect, useState } from 'react';
import { CreditCard, Download, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateReceiptPDF } from '@/lib/pdf';
import { toast } from 'sonner';

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
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function TenantPaymentsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments]       = useState<Payment[]>([]);
  const [info, setInfo]               = useState<TenantInfo | null>(null);
  const [loading, setLoading]         = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [tab, setTab]                 = useState<'all' | 'receipts'>('all');
  const [tenantId, setTenantId]       = useState<string | null>(null);
  const [companyId, setCompanyId]     = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();

    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        setTenantId(ta.tenant_id);
        setCompanyId(ta.company_id);

        const [{ data: pmts }, { data: tenant }, { data: lease }, { data: company }] = await Promise.all([
          sb.from('rent_payments')
            .select('id,amount,charges_amount,status,period_month,period_year,payment_method,paid_date,due_date,reference')
            .eq('company_id', ta.company_id)
            .eq('tenant_id', ta.tenant_id)
            .order('period_year', { ascending: false })
            .order('period_month', { ascending: false }),

          sb.from('tenants')
            .select('first_name,last_name,phone,properties(name,address,city,type)')
            .eq('id', ta.tenant_id).maybeSingle(),

          sb.from('leases')
            .select('rent_amount')
            .eq('tenant_id', ta.tenant_id)
            .eq('status', 'active').maybeSingle(),

          sb.from('companies')
            .select('name,email,phone,address,logo_url,primary_color')
            .eq('id', ta.company_id).maybeSingle(),
        ]);

        setPayments((pmts || []) as Payment[]);
        setInfo({
          tenant: tenant ? { first_name: (tenant as any).first_name, last_name: (tenant as any).last_name, phone: (tenant as any).phone } : null,
          property: (tenant as any)?.properties || null,
          lease: lease as any,
          company: company as any,
        });
        setLoading(false);

        // Realtime — sync new payments immediately
        const channel = sb.channel(`tenant-payments-${ta.tenant_id}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'rent_payments',
            filter: `tenant_id=eq.${ta.tenant_id}`,
          }, (payload) => {
            if (payload.eventType === 'INSERT') {
              setPayments(prev => [payload.new as Payment, ...prev]);
              toast.success('Nouveau paiement enregistré sur votre compte');
            } else if (payload.eventType === 'UPDATE') {
              setPayments(prev => prev.map(p => p.id === (payload.new as Payment).id ? payload.new as Payment : p));
              if ((payload.new as Payment).status === 'paid') {
                toast.success('Paiement confirmé ✅');
              }
            }
          })
          .subscribe();

        return () => { sb.removeChannel(channel); };
      });
  }, [user?.id]);

  const downloadReceipt = async (p: Payment) => {
    if (!info) return;
    setDownloading(p.id);
    try {
      await generateReceiptPDF({
        tenantName:   `${info.tenant?.first_name || ''} ${info.tenant?.last_name || ''}`,
        tenantPhone:  info.tenant?.phone || '',
        propertyName: info.property?.name || '',
        propertyAddress: `${info.property?.address || ''}, ${info.property?.city || ''}`,
        propertyType: info.property?.type || '',
        amount:         p.amount,
        chargesAmount: p.charges_amount || 0,
        periodMonth:  p.period_month,
        periodYear:   p.period_year,
        paidDate:       p.paid_date || p.due_date || '',
        paymentMethod: METHOD[p.payment_method] || p.payment_method,
        reference:    p.reference || undefined,
        companyName:  info.company?.name || '',
        companyEmail: info.company?.email || '',
        companyPhone: info.company?.phone || '',
        companyAddress: info.company?.address || '',
        companyLogoUrl: info.company?.logo_url || undefined,
        primaryColor: info.company?.primary_color || undefined,
      });
    } catch (e) {
      toast.error('Erreur génération PDF');
    }
    setDownloading(null);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

  const paid    = payments.filter(p => p.status === 'paid');
  const pending = payments.filter(p => p.status !== 'paid');
  const totalPaid = paid.reduce((s, p) => s + (p.amount || 0), 0);
  const displayed = tab === 'receipts' ? paid : payments;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <CreditCard size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Mes paiements</h1>
          <p className="text-sm text-muted-foreground">{payments.length} paiement(s) enregistré(s)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{paid.length}</p>
          <p className="text-xs font-medium text-green-700 mt-0.5">Payés</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs font-medium text-amber-700 mt-0.5">En attente</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 text-center">
          <p className="text-lg font-bold text-blue-600 truncate">{formatCurrency(totalPaid)}</p>
          <p className="text-xs font-medium text-blue-700 mt-0.5">Total payé</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {[
          { key: 'all', label: `Tous (${payments.length})` },
          { key: 'receipts', label: `Mes quittances (${paid.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">{tab === 'receipts' ? 'Aucune quittance disponible' : 'Aucun paiement enregistré'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(p => {
            const sm = STATUS[p.status] || { l: p.status, v: 'default' as BadgeVariant, icon: null };
            const isPaid = p.status === 'paid';
            return (
              <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 ${
                p.status === 'late' || p.status === 'overdue'
                  ? 'border-red-200 dark:border-red-800'
                  : 'border-border'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isPaid ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                             : p.status === 'late' || p.status === 'overdue' ? 'bg-red-100 text-red-600'
                             : 'bg-amber-100 text-amber-600'
                    }`}>
                      {sm.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{MONTHS[p.period_month - 1]} {p.period_year}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.amount)}
                        {p.charges_amount > 0 && ` + ${formatCurrency(p.charges_amount)} charges`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={sm.v}>
                    <span className="flex items-center gap-1">{sm.icon} {sm.l}</span>
                  </Badge>
                </div>

                {isPaid && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                    <span>
                      {p.paid_date && `Payé le ${formatDate(p.paid_date)}`}
                      {p.payment_method && ` · ${METHOD[p.payment_method] || p.payment_method}`}
                    </span>
                    <button onClick={() => downloadReceipt(p)} disabled={downloading === p.id}
                      className="flex items-center gap-1 text-primary hover:underline font-medium">
                      {downloading === p.id ? <LoadingSpinner size={12} /> : <Download size={12} />}
                      Quittance PDF
                    </button>
                  </div>
                )}

                {!isPaid && p.due_date && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                    Échéance : {formatDate(p.due_date)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}