'use client';
import { useEffect, useState } from 'react';
import { CreditCard, Download, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

type Payment = { id:string; amount:number; charges_amount:number|null; status:string; period_month:number; period_year:number; paid_date:string|null; due_date:string|null; payment_method:string|null; receipt_url:string|null };

const STATUS_CFG: Record<string,{l:string;v:BadgeVariant;icon:React.ReactNode}> = {
  paid:    { l:'Paye',      v:'success', icon:<CheckCircle size={14} className="text-green-600"/> },
  pending: { l:'En attente',v:'warning', icon:<Clock size={14} className="text-amber-600"/> },
  late:    { l:'En retard', v:'error',   icon:<AlertTriangle size={14} className="text-red-600"/> },
  overdue: { l:'En retard', v:'error',   icon:<AlertTriangle size={14} className="text-red-600"/> },
};

export default function TenantPaymentsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState({ paid:0, pending:0, overdue:0 });

  useEffect(() => {
    if (!user?.id) return;
    createClient().from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        createClient().from('rent_payments').select('*')
          .eq('company_id', ta.company_id)
          .order('period_year', { ascending:false })
          .order('period_month', { ascending:false })
          .then(({ data }) => {
            const list = (data||[]) as Payment[];
            setPayments(list);
            setTotal({
              paid: list.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0),
              pending: list.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0),
              overdue: list.filter(p=>p.status==='late'||p.status==='overdue').reduce((s,p)=>s+p.amount,0),
            });
            setLoading(false);
          });
      });
  }, [user?.id]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">Mes paiements</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Paye',       value:total.paid,    color:'bg-green-50 border-green-100 text-green-700' },
          { label:'En attente', value:total.pending, color:'bg-amber-50 border-amber-100 text-amber-700' },
          { label:'En retard',  value:total.overdue, color:'bg-red-50 border-red-100 text-red-700' },
        ].map(s => (
          <div key={s.label} className={'rounded-2xl border p-3 text-center '+s.color}>
            <p className="text-xs font-semibold mb-1">{s.label}</p>
            <p className="font-bold text-sm">{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Payments list */}
      {payments.length===0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Aucun paiement enregistre</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => {
            const sm = STATUS_CFG[p.status]||{l:p.status,v:'default' as BadgeVariant,icon:null};
            return (
              <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 '+(p.status==='paid'?'bg-green-50':p.status==='pending'?'bg-amber-50':'bg-red-50')}>
                      {sm.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Loyer {p.period_month}/{p.period_year}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paid_date ? 'Paye le '+formatDate(p.paid_date) : p.due_date ? 'Echeance: '+formatDate(p.due_date) : ''}
                        {p.payment_method ? ' · '+p.payment_method : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{formatCurrency(p.amount)}</p>
                    {p.charges_amount ? <p className="text-xs text-muted-foreground">+{formatCurrency(p.charges_amount)} charges</p> : null}
                    <Badge variant={sm.v} className="mt-1">{sm.l}</Badge>
                  </div>
                </div>
                {p.status==='paid' && (
                  <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-slate-50 transition-colors">
                    <Download size={13}/> Telecharger le recu
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}