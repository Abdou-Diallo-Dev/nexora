'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Phone, Mail, Calendar, CheckCircle, AlertTriangle, Clock, Download, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, cardCls, btnPrimary } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

type Payment = { id:string; amount:number; status:string; period_month:number; period_year:number; paid_date:string|null; payment_method:string|null; due_date:string|null };
type Tenant = { id:string; first_name:string; last_name:string; email:string; phone:string|null; status:string };

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function getMonthStatus(payments: Payment[], month: number, year: number, today: Date) {
  const p = payments.find(p => p.period_month === month && p.period_year === year);
  if (!p) {
    // Future months
    if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth()+1)) return 'future';
    // Past months without payment
    if (year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth()+1)) return 'missing';
    // Current month - check day
    const day = today.getDate();
    if (day >= 10) return 'late_no_payment';
    if (day >= 6) return 'pending_no_payment';
    return 'future';
  }
  if (p.status === 'paid') return 'paid';
  const day = today.getDate();
  const isCurrentMonth = p.period_month === today.getMonth()+1 && p.period_year === today.getFullYear();
  if (isCurrentMonth) {
    if (day >= 10) return 'late';
    if (day >= 6) return 'pending';
    return 'pending';
  }
  return p.status === 'late' || p.status === 'overdue' ? 'late' : 'pending';
}

function MonthCell({ status, month }: { status: string; month: string }) {
  const cfg: Record<string,{bg:string;text:string;icon:React.ReactNode}> = {
    paid:              { bg:'bg-green-100 border-green-300', text:'text-green-700', icon:<CheckCircle size={14}/> },
    late:              { bg:'bg-red-100 border-red-300', text:'text-red-700', icon:<AlertTriangle size={14}/> },
    late_no_payment:   { bg:'bg-red-100 border-red-300', text:'text-red-700', icon:<AlertTriangle size={14}/> },
    pending:           { bg:'bg-amber-50 border-amber-200', text:'text-amber-700', icon:<Clock size={14}/> },
    pending_no_payment:{ bg:'bg-amber-50 border-amber-200', text:'text-amber-700', icon:<Clock size={14}/> },
    missing:           { bg:'bg-red-50 border-red-200', text:'text-red-500', icon:<AlertTriangle size={12}/> },
    future:            { bg:'bg-slate-50 border-slate-200', text:'text-slate-400', icon:<span className="text-xs">—</span> },
  };
  const c = cfg[status] || cfg.future;
  return (
    <div className={`flex flex-col items-center p-2 rounded-xl border ${c.bg}`}>
      <span className={`text-xs font-semibold ${c.text}`}>{month}</span>
      <span className={`mt-1 ${c.text}`}>{c.icon}</span>
    </div>
  );
}

export default function TenantDetailPage() {
  const { company } = useAuthStore();
  const params = useParams();
  const id = params?.id as string;
  const [tenant, setTenant] = useState<Tenant|null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const year = today.getFullYear();

  useEffect(() => {
    if (!company?.id || !id) return;
    const sb = createClient();
    Promise.all([
      sb.from('tenants').select('id,first_name,last_name,email,phone,status').eq('id', id).maybeSingle(),
      sb.from('rent_payments').select('id,amount,status,period_month,period_year,paid_date,payment_method,due_date')
        .eq('tenant_id', id).eq('company_id', company.id)
        .order('period_year', { ascending:false }).order('period_month', { ascending:false }).limit(24),
    ]).then(([{data:t},{data:p}]) => {
      setTenant(t as Tenant);
      setPayments((p||[]) as Payment[]);
      setLoading(false);
    });
  }, [company?.id, id]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;
  if (!tenant) return <div className="text-center py-16 text-muted-foreground">Locataire introuvable</div>;

  const paid = payments.filter(p=>p.status==='paid');
  const late = payments.filter(p=>p.status==='late'||p.status==='overdue');
  const totalPaid = paid.reduce((s,p)=>s+Number(p.amount),0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/real-estate/tenants" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{tenant.first_name} {tenant.last_name}</h1>
          <p className="text-sm text-muted-foreground">Suivi des paiements</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/real-estate/messages`} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
            💬 Messagerie
          </Link>
          <Link href={`/real-estate/tenants/${id}/edit`} className={btnPrimary}>Modifier</Link>
        </div>
      </div>

      {/* Infos locataire */}
      <div className={cardCls+' p-5'}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
            {tenant.first_name.charAt(0)}{tenant.last_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-foreground">{tenant.first_name} {tenant.last_name}</p>
              <Badge variant={tenant.status==='active'?'success':'default'}>{tenant.status==='active'?'Actif':'Inactif'}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {tenant.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={11}/>{tenant.email}</span>}
              {tenant.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={11}/>{tenant.phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Payés', value:paid.length, color:'text-green-700 bg-green-50 border-green-100' },
          { label:'En retard', value:late.length, color:late.length>0?'text-red-700 bg-red-50 border-red-100':'text-green-700 bg-green-50 border-green-100' },
          { label:'Total collecté', value:formatCurrency(totalPaid), color:'text-blue-700 bg-blue-50 border-blue-100' },
          { label:'Taux paiement', value:payments.length>0?Math.round((paid.length/payments.length)*100)+'%':'—', color:'text-primary bg-primary/10 border-primary/20' },
        ].map((k,i) => (
          <div key={i} className={`border rounded-2xl p-4 ${k.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-80">{k.label}</p>
            <p className="text-xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Suivi mensuel */}
      <div className={cardCls+' p-5'}>
        <h3 className="font-semibold text-foreground mb-4">📅 Suivi mensuel {year}</h3>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {Array.from({length:12},(_,i)=>i+1).map(m => (
            <MonthCell key={m} month={MONTHS[m-1]} status={getMonthStatus(payments, m, year, today)}/>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-green-700"><CheckCircle size={12}/>Payé</span>
          <span className="flex items-center gap-1.5 text-xs text-red-700"><AlertTriangle size={12}/>En retard</span>
          <span className="flex items-center gap-1.5 text-xs text-amber-700"><Clock size={12}/>En attente</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400"><span>—</span>Non concerné</span>
        </div>
      </div>

      {/* Historique paiements */}
      <div className={cardCls}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Historique des paiements</h3>
          <Link href="/real-estate/payments/new" className="text-xs text-primary hover:underline">+ Enregistrer</Link>
        </div>
        <div className="divide-y divide-border">
          {payments.length===0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Aucun paiement enregistré</p>
          ) : payments.map(p => {
            const isPaid = p.status==='paid';
            const isLate = p.status==='late'||p.status==='overdue';
            return (
              <div key={p.id} className={`flex items-center justify-between px-5 py-3.5 ${isLate?'bg-red-50/30 dark:bg-red-900/10':''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPaid?'bg-green-100 text-green-600':isLate?'bg-red-100 text-red-600':'bg-amber-100 text-amber-600'}`}>
                    {isPaid?<CheckCircle size={14}/>:isLate?<AlertTriangle size={14}/>:<Clock size={14}/>}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{MONTHS[p.period_month-1]} {p.period_year}</p>
                    <p className="text-xs text-muted-foreground">
                      {isPaid && p.paid_date ? `Payé le ${formatDate(p.paid_date)}` : isLate ? 'En retard' : 'En attente'}
                      {p.payment_method && ` · ${p.payment_method}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-foreground">{formatCurrency(Number(p.amount))}</span>
                  <Badge variant={isPaid?'success':isLate?'error':'warning'}>{isPaid?'Payé':isLate?'Retard':'Attente'}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}