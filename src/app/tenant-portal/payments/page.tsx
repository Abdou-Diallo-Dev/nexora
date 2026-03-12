'use client';
import { useEffect, useState } from 'react';
import { CreditCard, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant, cardCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateReceiptPDF } from '@/lib/pdf';

type Payment = {
  id: string; amount: number; status: string;
  period_month: number; period_year: number;
  paid_date: string|null; due_date: string|null;
  reference: string|null;
  tenants: { first_name:string; last_name:string; phone:string|null } | null;
  properties: { name:string; address:string; city:string; type:string } | null;
  companies: { name:string; email:string|null; phone:string|null } | null;
};

const STATUS: Record<string,{l:string;v:BadgeVariant;icon:React.ReactNode}> = {
  paid:    { l:'Payé',       v:'success', icon:<CheckCircle size={14}/> },
  pending: { l:'En attente', v:'warning', icon:<Clock size={14}/> },
  late:    { l:'En retard',  v:'error',   icon:<AlertTriangle size={14}/> },
  overdue: { l:'Impayé',     v:'error',   icon:<AlertTriangle size={14}/> },
};

export default function TenantPaymentsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string|null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        const { data } = await sb.from('rent_payments')
          .select('id,amount,status,period_month,period_year,paid_date,due_date,reference,tenants(first_name,last_name,phone),properties(name,address,city,type),companies(name,email,phone)')
          .eq('company_id', ta.company_id)
          .eq('tenant_id', ta.tenant_id)
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false });
        setPayments((data || []) as any);
        setLoading(false);
      });
  }, [user?.id]);

  const downloadReceipt = async (p: Payment) => {
    if (p.status !== 'paid') return;
    setDownloading(p.id);
    try {
      await generateReceiptPDF({
        tenantName:      `${p.tenants?.first_name || ''} ${p.tenants?.last_name || ''}`.trim(),
        tenantPhone:     p.tenants?.phone ?? undefined,
        propertyName:    p.properties?.name || p.properties?.address || '',
        propertyAddress: p.properties?.address || '',
        propertyCity:    p.properties?.city || '',
        propertyType:    p.properties?.type || '',
        amount:          p.amount,
        chargesAmount:   0,
        periodMonth:     p.period_month,
        periodYear:      p.period_year,
        paidDate:        p.paid_date ?? undefined,
        paymentMethod:   'cash',
        reference:       p.reference ?? undefined,
        companyName:     p.companies?.name || '',
        companyPhone:    p.companies?.phone ?? undefined,
        companyEmail:    p.companies?.email ?? undefined,
        status:          'paid',
      });
    } catch {}
    setDownloading(null);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <CreditCard size={20} className="text-blue-600"/>
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Mes paiements</h1>
          <p className="text-xs text-muted-foreground">{payments.length} paiement(s)</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className={cardCls+' p-8 text-center text-muted-foreground'}>Aucun paiement trouvé</div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => {
            const st = STATUS[p.status] || { l: p.status, v: 'default' as BadgeVariant, icon: null };
            return (
              <div key={p.id} className={cardCls+' p-4'}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                      <CreditCard size={16} className="text-muted-foreground"/>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{p.period_month}/{p.period_year}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p>
                      {p.paid_date && <p className="text-xs text-muted-foreground">Payé le {formatDate(p.paid_date)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={st.v}>{st.l}</Badge>
                    {p.status === 'paid' && (
                      <button onClick={() => downloadReceipt(p)} disabled={downloading === p.id}
                        className="w-8 h-8 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 transition-colors">
                        {downloading === p.id ? <LoadingSpinner size={14}/> : <Download size={14}/>}
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