'use client';
import { useEffect, useState } from 'react';
import { CreditCard, FileText, Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

type TenantData = {
  tenant: { first_name:string; last_name:string; phone:string|null } | null;
  lease: { rent_amount:number; end_date:string; properties:{name:string;address:string}|null } | null;
  pendingPayments: { id:string; amount:number; period_month:number; period_year:number; due_date:string|null }[];
  recentTickets: { id:string; title:string; status:string; created_at:string }[];
  unreadMessages: number;
};

const TICKET_STATUS: Record<string,{l:string;v:BadgeVariant}> = {
  open:       { l:'Ouvert',       v:'warning' },
  in_progress:{ l:'En cours',     v:'info' },
  resolved:   { l:'Resolu',       v:'success' },
  closed:     { l:'Ferme',        v:'default' },
};

export default function TenantDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<TenantData|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    // Find tenant account linked to this user
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        const [{ data: tenant }, { data: leases }, { data: payments }, { data: tickets }, { count: unread }] = await Promise.all([
          sb.from('tenants').select('first_name,last_name,phone').eq('id', ta.tenant_id).maybeSingle(),
          sb.from('leases').select('rent_amount,end_date,properties(name,address)').eq('tenant_id', ta.tenant_id).eq('status','active').maybeSingle(),
          sb.from('rent_payments').select('id,amount,period_month,period_year,due_date').eq('company_id', ta.company_id).eq('status','pending').order('due_date', {ascending:true}).limit(3),
          sb.from('tenant_tickets').select('id,title,status,created_at').eq('tenant_id', ta.tenant_id).order('created_at',{ascending:false}).limit(3),
          sb.from('messages').select('id',{count:'exact'}).eq('tenant_id', ta.tenant_id).eq('sender_role','company').eq('is_read',false),
        ]);
        setData({ tenant: tenant as any, lease: leases as any, pendingPayments:(payments||[]) as any, recentTickets:(tickets||[]) as any, unreadMessages:unread||0 });
        setLoading(false);
      });
  }, [user?.id]);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80 mb-1">Bonjour 👋</p>
        <h1 className="text-xl font-bold">{data?.tenant?.first_name} {data?.tenant?.last_name}</h1>
        {data?.lease && (
          <p className="text-sm opacity-80 mt-2">
            📍 {(data.lease.properties as any)?.address || '—'}
          </p>
        )}
      </div>

      {/* Lease info */}
      {data?.lease && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Mon contrat</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Loyer mensuel</p>
              <p className="font-bold text-foreground text-lg">{formatCurrency(data.lease.rent_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fin de bail</p>
              <p className="font-semibold text-foreground">{formatDate(data.lease.end_date)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href:'/tenant-portal/payments',  label:'Mes paiements',  icon:<CreditCard size={20}/>, color:'bg-blue-50 border-blue-100 text-blue-700' },
          { href:'/tenant-portal/tickets',   label:'Signaler un probleme', icon:<Wrench size={20}/>, color:'bg-orange-50 border-orange-100 text-orange-700' },
          { href:'/tenant-portal/messages',  label:'Messagerie', icon:<FileText size={20}/>,    color:'bg-green-50 border-green-100 text-green-700', badge: data?.unreadMessages },
          { href:'/tenant-portal/tickets',   label:'Mes tickets', icon:<CheckCircle size={20}/>, color:'bg-primary/10 border-primary/20 text-primary' },
        ].map(item => (
          <Link key={item.href+item.label} href={item.href}
            className={'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors relative '+item.color}>
            {item.badge ? <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{item.badge}</span> : null}
            {item.icon}
            <span className="text-xs font-semibold text-center">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Pending payments */}
      {data?.pendingPayments && data.pendingPayments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Paiements en attente</p>
          <div className="space-y-2">
            {data.pendingPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-600"/>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.period_month}/{p.period_year}</p>
                    {p.due_date && <p className="text-xs text-muted-foreground">Echeance: {formatDate(p.due_date)}</p>}
                  </div>
                </div>
                <span className="font-bold text-amber-700">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent tickets */}
      {data?.recentTickets && data.recentTickets.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Mes derniers tickets</p>
          <div className="space-y-2">
            {data.recentTickets.map(t => {
              const sm = TICKET_STATUS[t.status]||{l:t.status,v:'default' as BadgeVariant};
              return (
                <Link key={t.id} href={'/tenant-portal/tickets'} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                  <Badge variant={sm.v}>{sm.l}</Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}