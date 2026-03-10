'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Users, CreditCard, Wrench, AlertTriangle, Clock, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, UserRole } from '@/lib/store';
import { StatCard, LoadingSpinner, cardCls, btnPrimary } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { qc } from '@/lib/cache';
import { getDashboardSections, can } from '@/lib/permissions';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type KPIs = {
  totalProps: number; rentedProps: number; availableProps: number;
  activeTenants: number; monthlyRevenue: number; pendingAmount: number;
  overdueAmount: number; openTickets: number;
  expiringLeases: { id:string; tenant:string; property:string; end_date:string }[];
  overdueRents: { id:string; tenant:string; amount:number; period_month:number; period_year:number }[];
  chart: { month:string; revenue:number }[];
};

const ROLE_WELCOME: Record<string, string> = {
  admin:   'Acces complet — toutes les fonctionnalites disponibles',
  manager: 'Gestion operationnelle — biens, locataires, paiements, maintenance',
  agent:   'Espace agent — paiements et tickets de maintenance',
  viewer:  'Mode lecture — consultation uniquement, aucune modification',
};

export default function REDashboard() {
  const { company, user } = useAuthStore();
  const [data, setData] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const role = (user?.role || 'viewer') as UserRole;
  const sections = getDashboardSections(role);

  useEffect(() => {
    if (!company?.id) return;
    const cacheKey = 're-dash-' + company.id;
    const cached = qc.get<KPIs>(cacheKey);
    if (cached) { setData(cached); setLoading(false); return; }

    const sb = createClient();
    const cid = company.id;
    Promise.all([
      sb.from('properties').select('id,status').eq('company_id', cid),
      sb.from('leases').select('id,status,end_date,rent_amount,tenants(first_name,last_name),properties(address)').eq('company_id', cid),
      sb.from('rent_payments').select('id,amount,status,period_month,period_year,tenants(first_name,last_name)').eq('company_id', cid).limit(200),
      sb.from('maintenance_tickets').select('id,status').eq('company_id', cid),
    ]).then(([{ data: props }, { data: leases }, { data: payments }, { data: tickets }]) => {
      const P = props || [];
      type LeaseRow = { id:string; status:string; end_date:string; rent_amount:number; tenants:{first_name:string;last_name:string}|null; properties:{address:string}|null };
      type PayRow   = { id:string; amount:number; status:string; period_month:number; period_year:number; tenants:{first_name:string;last_name:string}|null };
      const L   = (leases   || []) as unknown as LeaseRow[];
      const PAY = (payments || []) as unknown as PayRow[];
      const T   = tickets   || [];
      const active  = L.filter(l => l.status === 'active');
      const paid    = PAY.filter(p => p.status === 'paid');
      const overdue = PAY.filter(p => p.status === 'late' || p.status === 'overdue');
      const pending = PAY.filter(p => p.status === 'pending');
      const now = new Date();
      const chart = Array.from({ length: 6 }, (_, i) => {
        const d  = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const mo = String(d.getMonth()+1)+'/'+String(d.getFullYear());
        return { month: format(d, 'MMM', { locale: fr }), revenue: paid.filter(p => String(p.period_month)+'/'+String(p.period_year)===mo).reduce((s,p)=>s+p.amount,0) };
      });
      const thisMonth = String(now.getMonth()+1)+'/'+String(now.getFullYear());
      const result: KPIs = {
        totalProps: P.length,
        rentedProps: P.filter(p=>p.status==='rented').length,
        availableProps: P.filter(p=>p.status==='available').length,
        activeTenants: active.length,
        monthlyRevenue: paid.filter(p=>String(p.period_month)+'/'+String(p.period_year)===thisMonth).reduce((s,p)=>s+p.amount,0),
        pendingAmount: pending.reduce((s,p)=>s+p.amount,0),
        overdueAmount: overdue.reduce((s,p)=>s+p.amount,0),
        openTickets: T.filter(t=>t.status==='open'||t.status==='in_progress').length,
        expiringLeases: active.filter(l=>{ const d=new Date(l.end_date); const diff=(d.getTime()-now.getTime())/(1000*60*60*24); return diff>=0&&diff<=60; })
          .map(l=>({ id:l.id, tenant:(l.tenants?.first_name||'')+' '+(l.tenants?.last_name||''), property:l.properties?.address||'', end_date:l.end_date })),
        overdueRents: overdue.slice(0,5).map(r=>({ id:r.id, tenant:(r.tenants?.first_name||'')+' '+(r.tenants?.last_name||''), amount:r.amount, period_month:r.period_month, period_year:r.period_year })),
        chart,
      };
      qc.set(cacheKey, result);
      setData(result);
      setLoading(false);
    });
  }, [company?.id]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;
  if (!data) return null;

  const occupancy = data.totalProps > 0 ? Math.round((data.rentedProps/data.totalProps)*100) : 0;
  const pieData = [
    { name:'Loues',      value:data.rentedProps,    color:'#3b82f6' },
    { name:'Disponibles',value:data.availableProps, color:'#22c55e' },
    { name:'Autres',     value:Math.max(0,data.totalProps-data.rentedProps-data.availableProps), color:'#94a3b8' },
  ].filter(d=>d.value>0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bonjour, {user?.full_name?.split(' ')[0] || 'Utilisateur'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ROLE_WELCOME[role] || 'Tableau de bord Nexora Immo'}
          </p>
        </div>
        {can.createPayment(role) && (
          <Link href="/real-estate/payments/new" className={btnPrimary}>
            <CreditCard size={16}/> Enregistrer paiement
          </Link>
        )}
      </div>

      {/* Role info banner for limited roles */}
      {(role === 'agent' || role === 'viewer') && (
        <div className={'px-4 py-3 rounded-2xl border text-sm flex items-center gap-2 '+(
          role==='viewer'
            ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
        )}>
          {role==='viewer' ? '👁 ' : '⚡ '}
          <span>{ROLE_WELCOME[role]}</span>
        </div>
      )}

      {/* KPI Cards — filtered by role */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { show:true, title:'Biens immobiliers', value:data.totalProps, subtitle:data.rentedProps+' loues · '+data.availableProps+' disponibles', icon:<Home size={20}/>, color:'blue' as const, href:'/real-estate/properties' },
          { show:true, title:'Locataires actifs', value:data.activeTenants, subtitle:'Contrats en cours', icon:<Users size={20}/>, color:'green' as const, href:'/real-estate/tenants' },
          { show:sections.showRevenue, title:'Revenus du mois', value:formatCurrency(data.monthlyRevenue), subtitle:formatCurrency(data.pendingAmount)+' en attente', icon:<CreditCard size={20}/>, color:'purple' as const, href:'/real-estate/payments' },
          { show:true, title:'Tickets ouverts', value:data.openTickets, subtitle:'Maintenances en cours', icon:<Wrench size={20}/>, color:'orange' as const, href:'/real-estate/maintenance' },
        ].filter(k=>k.show).map((k,i) => (
          <motion.div key={k.title} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
            <Link href={k.href}>
              <StatCard title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} color={k.color}/>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Overdue alert */}
      {sections.showPendingRents && data.overdueAmount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0"/>
          <p className="text-sm text-red-800 dark:text-red-300">
            <span className="font-semibold">{formatCurrency(data.overdueAmount)}</span> de loyers en retard — {data.overdueRents.length} locataire(s)
          </p>
        </div>
      )}

      {/* Charts — admin & manager only */}
      {sections.showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={cardCls+' lg:col-span-2 p-5'}>
            <h3 className="font-semibold text-foreground mb-4">Revenus — 6 derniers mois</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.chart} barSize={28}>
                <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v:number)=>formatCurrency(v)}/>
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} name="Revenus"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3">Occupation</h3>
            <div className="flex flex-col items-center">
              <div className="relative">
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx={66} cy={66} innerRadius={44} outerRadius={60} paddingAngle={3} dataKey="value">
                    {pieData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{occupancy}%</p>
                    <p className="text-xs text-muted-foreground">occupe</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mt-3 w-full">
                {pieData.map(d=>(
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/>
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring leases + overdue rents */}
      {sections.showExpiring && (data.expiringLeases.length>0||data.overdueRents.length>0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.expiringLeases.length>0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={15} className="text-amber-600"/>
                <h3 className="font-semibold text-amber-800 dark:text-amber-400 text-sm">Baux expirant bientot ({data.expiringLeases.length})</h3>
              </div>
              <div className="space-y-2">
                {data.expiringLeases.map(l=>(
                  <Link key={l.id} href={'/real-estate/leases/'+l.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl hover:shadow-sm transition-shadow">
                    <div><p className="text-xs font-medium text-foreground">{l.tenant}</p><p className="text-xs text-muted-foreground">{l.property}</p></div>
                    <span className="text-xs font-bold text-amber-600">{formatDate(l.end_date)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {data.overdueRents.length>0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-red-600"/>
                <h3 className="font-semibold text-red-800 dark:text-red-400 text-sm">Loyers en retard ({data.overdueRents.length})</h3>
              </div>
              <div className="space-y-2">
                {data.overdueRents.map(r=>(
                  <Link key={r.id} href="/real-estate/payments" className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl hover:shadow-sm transition-shadow">
                    <div><p className="text-xs font-medium text-foreground">{r.tenant}</p><p className="text-xs text-muted-foreground">{r.period_month}/{r.period_year}</p></div>
                    <span className="text-xs font-bold text-red-600">{formatCurrency(r.amount)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maintenance rapide pour agent */}
      {role === 'agent' && (
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-3">Vos actions disponibles</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/real-estate/payments/new" className="flex items-center gap-2.5 p-4 rounded-2xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700">
              <CreditCard size={16}/><span className="text-sm font-medium">Enregistrer paiement</span>
            </Link>
            <Link href="/real-estate/maintenance/new" className="flex items-center gap-2.5 p-4 rounded-2xl border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors text-orange-700">
              <Wrench size={16}/><span className="text-sm font-medium">Nouveau ticket</span>
            </Link>
            <Link href="/real-estate/payments" className="flex items-center gap-2.5 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700">
              <CreditCard size={16}/><span className="text-sm font-medium">Voir paiements</span>
            </Link>
            <Link href="/real-estate/maintenance" className="flex items-center gap-2.5 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700">
              <Wrench size={16}/><span className="text-sm font-medium">Voir maintenance</span>
            </Link>
          </div>
        </div>
      )}

      {/* Viewer: lecture seule notice */}
      {role === 'viewer' && (
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-3">Acces en lecture seule</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href:'/real-estate/properties', label:'Biens',      icon:<Home size={16}/>,      cls:'text-blue-700 bg-blue-50 border-blue-100' },
              { href:'/real-estate/tenants',    label:'Locataires', icon:<Users size={16}/>,     cls:'text-green-700 bg-green-50 border-green-100' },
              { href:'/real-estate/leases',     label:'Contrats',   icon:<FileText size={16}/>,  cls:'text-purple-700 bg-purple-50 border-purple-100' },
              { href:'/real-estate/maintenance',label:'Maintenance', icon:<Wrench size={16}/>,   cls:'text-orange-700 bg-orange-50 border-orange-100' },
            ].map(item=>(
              <Link key={item.href} href={item.href} className={'flex items-center gap-2.5 p-4 rounded-2xl border transition-colors '+item.cls}>
                {item.icon}<span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions — admin & manager */}
      {sections.showQuickActions && role !== 'agent' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href:'/real-estate/properties/new', label:'Nouveau bien',      icon:<Home size={16}/>,       cls:'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100' },
            { href:'/real-estate/tenants/new',    label:'Nouveau locataire', icon:<Users size={16}/>,      cls:'text-green-600 bg-green-50 hover:bg-green-100 border-green-100' },
            { href:'/real-estate/leases/new',     label:'Nouveau bail',      icon:<FileText size={16}/>,   cls:'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100' },
            { href:'/real-estate/payments/new',   label:'Paiement',          icon:<CreditCard size={16}/>, cls:'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100' },
          ].map(item=>(
            <Link key={item.href} href={item.href} className={'flex items-center gap-2.5 p-4 rounded-2xl border transition-all '+item.cls}>
              {item.icon}<span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}