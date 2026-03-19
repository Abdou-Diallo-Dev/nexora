'use client';
import { useEffect, useState } from 'react';
import { CreditCard, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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
  lease: { rent_amount: number; payment_day: number | null } | null;
};

const METHOD: Record<string, string> = {
  cash: 'Espèces', bank_transfer: 'Virement', wave: 'Wave',
  orange_money: 'Orange Money', free_money: 'Free Money', check: 'Chèque',
};
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function isLate(p: Payment): boolean {
  if (p.status === 'paid') return false;
  const today = new Date();
  const dayOfMonth = today.getDate();
  // En retard si jour >= 6 et pas encore payé pour ce mois/année
  const isCurrentOrPast = (p.period_year < today.getFullYear()) ||
    (p.period_year === today.getFullYear() && p.period_month <= today.getMonth() + 1);
  return isCurrentOrPast && dayOfMonth >= 6 && p.status !== 'paid';
}

function getStatusInfo(p: Payment): { label: string; variant: BadgeVariant; icon: React.ReactNode; color: string } {
  if (p.status === 'paid') return { label: 'Payé ✓', variant: 'success', icon: <CheckCircle size={14}/>, color: 'bg-green-100 text-green-600 dark:bg-green-900/30' };
  if (p.status === 'late' || p.status === 'overdue' || isLate(p)) return { label: 'En retard', variant: 'error', icon: <AlertTriangle size={14}/>, color: 'bg-red-100 text-red-600 dark:bg-red-900/30' };
  return { label: 'En attente', variant: 'warning', icon: <Clock size={14}/>, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' };
}

export default function TenantPaymentsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'receipts'>('all');

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        const [{ data: pmts }, { data: tenant }, { data: lease }, { data: company }] = await Promise.all([
          sb.from('rent_payments')
            .select('id,amount,charges_amount,status,period_month,period_year,payment_method,paid_date,due_date,reference')
            .eq('company_id', ta.company_id).eq('tenant_id', ta.tenant_id)
            .order('period_year', { ascending: false }).order('period_month', { ascending: false }),
          sb.from('tenants').select('first_name,last_name,phone,properties(name,address,city,type)').eq('id', ta.tenant_id).maybeSingle(),
          sb.from('leases').select('rent_amount,payment_day').eq('tenant_id', ta.tenant_id).eq('status','active').maybeSingle(),
          sb.from('companies').select('name,email,phone,address,logo_url,primary_color').eq('id', ta.company_id).maybeSingle(),
        ]);
        setPayments((pmts || []) as Payment[]);
        setInfo({ tenant: tenant as any, property: (tenant as any)?.properties || null, lease: lease as any, company: company as any });
        setLoading(false);

        const channel = sb.channel(`tenant-payments-${ta.tenant_id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rent_payments', filter: `tenant_id=eq.${ta.tenant_id}` },
            (payload) => {
              if (payload.eventType === 'INSERT') { setPayments(prev => [payload.new as Payment, ...prev]); toast.success('Nouveau paiement enregistré'); }
              else if (payload.eventType === 'UPDATE') { setPayments(prev => prev.map(p => p.id === (payload.new as Payment).id ? payload.new as Payment : p)); if ((payload.new as Payment).status === 'paid') toast.success('Paiement confirmé ✅'); }
            }).subscribe();
        return () => { sb.removeChannel(channel); };
      });
  }, [user?.id]);

  const downloadReceipt = async (p: Payment) => {
    if (!info) return;
    setDownloading(p.id);
    try {
      await generateReceiptPDF({
        tenantName: `${info.tenant?.first_name||''} ${info.tenant?.last_name||''}`,
        tenantPhone: info.tenant?.phone || '',
        propertyName: info.property?.name || '',
        propertyAddress: `${info.property?.address||''}, ${info.property?.city||''}`,
        propertyType: info.property?.type || '',
        amount: p.amount, chargesAmount: p.charges_amount || 0,
        periodMonth: p.period_month, periodYear: p.period_year,
        paidDate: p.paid_date || p.due_date || '',
        paymentMethod: METHOD[p.payment_method] || p.payment_method,
        reference: p.reference || undefined,
        companyName: info.company?.name || '', companyEmail: info.company?.email || '',
        companyPhone: info.company?.phone || '', companyAddress: info.company?.address || '',
        companyLogoUrl: info.company?.logo_url || undefined, primaryColor: info.company?.primary_color || undefined,
      });
    } catch { toast.error('Erreur génération PDF'); }
    setDownloading(null);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  const paid = payments.filter(p => p.status === 'paid');
  const late = payments.filter(p => p.status !== 'paid' && (p.status === 'late' || p.status === 'overdue' || isLate(p)));
  const pending = payments.filter(p => p.status !== 'paid' && !isLate(p) && p.status !== 'late' && p.status !== 'overdue');
  const totalPaid = paid.reduce((s, p) => s + (p.amount || 0), 0);
  const displayed = tab === 'receipts' ? paid : payments;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <CreditCard size={20} className="text-primary"/>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Mes paiements</h1>
          <p className="text-sm text-muted-foreground">{payments.length} paiement(s) enregistré(s)</p>
        </div>
      </div>

      {/* Alerte retard */}
      {late.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-bold text-red-700">⚠️ Paiement(s) en retard</p>
            <p className="text-xs text-red-600 mt-0.5">
              Vous avez <strong>{late.length} paiement(s)</strong> en retard totalisant <strong>{formatCurrency(late.reduce((s,p)=>s+p.amount,0))}</strong>. Veuillez régulariser votre situation.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{paid.length}</p>
          <p className="text-xs font-medium text-green-700 mt-0.5">Payés</p>
        </div>
        <div className={`${late.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'} rounded-2xl p-3 text-center`}>
          <p className={`text-xl font-bold ${late.length > 0 ? 'text-red-600' : 'text-amber-600'}`}>{late.length + pending.length}</p>
          <p className={`text-xs font-medium mt-0.5 ${late.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>{late.length > 0 ? 'En retard' : 'En attente'}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 text-center">
          <p className="text-lg font-bold text-blue-600 truncate">{formatCurrency(totalPaid)}</p>
          <p className="text-xs font-medium text-blue-700 mt-0.5">Total payé</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {[{ key:'all', label:`Tous (${payments.length})` }, { key:'receipts', label:`Quittances (${paid.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Calendrier annuel */}
      {tab === 'all' && payments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Suivi mensuel {new Date().getFullYear()}</p>
          <div className="grid grid-cols-6 gap-2">
            {MONTHS.map((month, i) => {
              const mo = i + 1;
              const year = new Date().getFullYear();
              const payment = payments.find(p => p.period_month === mo && p.period_year === year);
              const today = new Date();
              const isFuture = year > today.getFullYear() || (year === today.getFullYear() && mo > today.getMonth() + 1);
              const statusInfo = payment ? getStatusInfo(payment) : null;
              return (
                <div key={i} className={`rounded-xl p-2 text-center ${
                  !payment && isFuture ? 'bg-slate-50 dark:bg-slate-700/30' :
                  payment?.status === 'paid' ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800' :
                  payment && (payment.status === 'late' || payment.status === 'overdue' || isLate(payment)) ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  payment ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100' :
                  'bg-slate-50 dark:bg-slate-700/30'
                }`}>
                  <p className="text-xs font-semibold text-foreground">{month}</p>
                  <div className="mt-1">
                    {payment?.status === 'paid' ? <span className="text-green-600 text-xs">✓</span> :
                     payment && (payment.status === 'late' || payment.status === 'overdue' || isLate(payment)) ? <span className="text-red-600 text-xs">!</span> :
                     payment ? <span className="text-amber-600 text-xs">⏳</span> :
                     isFuture ? <span className="text-slate-300 text-xs">—</span> :
                     <span className="text-slate-400 text-xs">?</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/>Payé</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/>En retard</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/>En attente</span>
          </div>
        </div>
      )}

      {/* List */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard size={32} className="mx-auto mb-2 opacity-20"/>
          <p className="text-sm">{tab === 'receipts' ? 'Aucune quittance disponible' : 'Aucun paiement enregistré'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(p => {
            const sm = getStatusInfo(p);
            const isPaid = p.status === 'paid';
            const isPaymentLate = !isPaid && (p.status === 'late' || p.status === 'overdue' || isLate(p));
            return (
              <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 ${isPaymentLate ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sm.color}`}>
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
                  <Badge variant={sm.variant}>
                    <span className="flex items-center gap-1">{sm.icon} {sm.label}</span>
                  </Badge>
                </div>

                {isPaymentLate && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-2">
                    <p className="text-xs text-red-700 font-medium">⚠️ Ce paiement est en retard. Merci de contacter votre gestionnaire.</p>
                  </div>
                )}

                {isPaid && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                    <span>
                      {p.paid_date && `Payé le ${formatDate(p.paid_date)}`}
                      {p.payment_method && ` · ${METHOD[p.payment_method] || p.payment_method}`}
                    </span>
                    <button onClick={() => downloadReceipt(p)} disabled={downloading === p.id}
                      className="flex items-center gap-1 text-primary hover:underline font-medium">
                      {downloading === p.id ? <LoadingSpinner size={12}/> : <Download size={12}/>}
                      Quittance PDF
                    </button>
                  </div>
                )}

                {!isPaid && p.due_date && (
                  <p className={`text-xs border-t border-border pt-2 mt-2 ${isPaymentLate ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {isPaymentLate ? `⏰ Échéance dépassée : ${formatDate(p.due_date)}` : `Échéance : ${formatDate(p.due_date)}`}
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