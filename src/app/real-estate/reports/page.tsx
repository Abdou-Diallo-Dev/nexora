'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Home, Users, Wrench, AlertTriangle, CheckCircle, Clock, Percent, Building2, ArrowUp, ArrowDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, cardCls, selectCls, PageHeader } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

type ReportData = {
  // Résumé exécutif
  currentMonthRevenue: number; currentMonthExpenses: number; currentMonthNet: number;
  prevMonthRevenue: number; prevMonthExpenses: number;
  collectionRate: number; totalProperties: number; totalTenants: number;
  commissionRate: number; totalCommissions: number;
  // Revenus
  collectedRents: number; pendingRents: number; overdueRents: number;
  revenueGrowth: number;
  // Dépenses par catégorie
  expensesByCategory: { name:string; amount:number; color:string }[];
  totalBailleurExp: number; totalEntrepriseExp: number;
  // Performance biens
  rentedProps: number; availableProps: number; occupancyRate: number;
  revenuePerProperty: { name:string; revenue:number }[];
  // Locataires
  activeTenants: number; paidTenants: number; lateTenants: number;
  topPayers: { name:string; amount:number; onTime:boolean }[];
  latePayers: { name:string; amount:number; periods:string }[];
  // Tickets
  openTickets: number; resolvedTickets: number; totalTickets: number;
  ticketsByCategory: { name:string; count:number }[];
  // Chart
  monthlyChart: { month:string; revenue:number; expenses:number; commissions:number; net:number }[];
  // Prévisions
  forecastRevenue: number; forecastExpenses: number;
};

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

export default function ReportsPage() {
  const { company } = useAuthStore();
  const [data, setData] = useState<ReportData|null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('3');

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();
    const cid = company.id;
    const months = parseInt(period);
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, months - 1));

    Promise.all([
      sb.from('rent_payments').select('id,amount,status,period_month,period_year,paid_date,tenant_id,leases(tenant_id,property_id,properties(name)),tenants(first_name,last_name)').eq('company_id', cid).limit(1000),
      sb.from('expenses').select('id,amount,type,category,date').eq('company_id', cid).limit(500),
      sb.from('properties').select('id,name,status,rent_amount').eq('company_id', cid),
      sb.from('leases').select('id,status,tenant_id,tenants(first_name,last_name)').eq('company_id', cid).eq('status','active'),
      sb.from('tenant_tickets').select('id,status,category').eq('company_id', cid),
      sb.from('companies').select('commission_rate').eq('id', cid).maybeSingle(),
    ]).then(([{ data: pays }, { data: exps }, { data: props }, { data: leas }, { data: tix }, { data: comp }]) => {
      const P = (pays||[]) as any[];
      const E = (exps||[]) as any[];
      const PR = (props||[]) as any[];
      const L = (leas||[]) as any[];
      const T = (tix||[]) as any[];
      const commRate = (comp as any)?.commission_rate ?? 10;

      const paid = P.filter(p => p.status === 'paid');
      const pending = P.filter(p => p.status === 'pending');
      const overdue = P.filter(p => p.status === 'late' || p.status === 'overdue');

      // Current & prev month
      const curMo = String(now.getMonth()+1)+'/'+String(now.getFullYear());
      const prevMo = String(subMonths(now,1).getMonth()+1)+'/'+String(subMonths(now,1).getFullYear());
      const curPaid = paid.filter(p => String(p.period_month)+'/'+String(p.period_year) === curMo);
      const prevPaid = paid.filter(p => String(p.period_month)+'/'+String(p.period_year) === prevMo);
      const currentMonthRevenue = curPaid.reduce((s:number,p:any) => s+p.amount, 0);
      const prevMonthRevenue = prevPaid.reduce((s:number,p:any) => s+p.amount, 0);
      const revenueGrowth = prevMonthRevenue > 0 ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0;

      const curExp = E.filter((e:any) => { const d = new Date(e.date); return String(d.getMonth()+1)+'/'+String(d.getFullYear()) === curMo; });
      const prevExp = E.filter((e:any) => { const d = new Date(e.date); return String(d.getMonth()+1)+'/'+String(d.getFullYear()) === prevMo; });
      const currentMonthExpenses = curExp.reduce((s:number,e:any) => s+e.amount, 0);
      const prevMonthExpenses = prevExp.reduce((s:number,e:any) => s+e.amount, 0);
      const currentMonthCommissions = currentMonthRevenue * (commRate/100);
      const currentMonthNet = currentMonthRevenue - currentMonthCommissions - currentMonthExpenses;

      // Collection rate — basé sur tous les paiements dans la période sélectionnée
      const allCurrentMonth = P.filter(p => String(p.period_month)+'/'+String(p.period_year) === curMo);
      const collectionRate = allCurrentMonth.length > 0 ? Math.round((curPaid.length / allCurrentMonth.length) * 100) : 
        (P.length > 0 ? Math.round((paid.length / P.length) * 100) : 0);

      // Expenses by category
      const catMap: Record<string,number> = {};
      E.forEach((e:any) => { catMap[e.category||'Autre'] = (catMap[e.category||'Autre']||0) + e.amount; });
      const expensesByCategory = Object.entries(catMap).sort((a,b) => b[1]-a[1]).map(([name,amount],i) => ({ name, amount, color: COLORS[i%COLORS.length] }));
      const totalBailleurExp = E.filter((e:any) => e.type==='bailleur').reduce((s:number,e:any) => s+e.amount, 0);
      const totalEntrepriseExp = E.filter((e:any) => e.type==='entreprise').reduce((s:number,e:any) => s+e.amount, 0);

      // Properties
      const rentedProps = PR.filter((p:any) => p.status==='rented').length;
      const availableProps = PR.filter((p:any) => p.status==='available').length;
      // Taux d'occupation basé sur les baux actifs
      const occupancyRate = PR.length > 0 ? Math.round((L.length/PR.length)*100) : 0;
      const revenuePerProperty = PR.filter((p:any) => p.status==='rented').slice(0,6).map((p:any) => ({
        name: p.name.length > 12 ? p.name.slice(0,12)+'…' : p.name,
        revenue: paid.filter((pay:any) => pay.leases?.property_id === p.id).reduce((s:number,pay:any) => s+pay.amount, 0),
      }));

      // Tenants
      const tenantPayMap: Record<string,{name:string;amount:number;paid:boolean}> = {};
      paid.forEach((p:any) => {
        const name = (p.tenants?.first_name||'') + ' ' + (p.tenants?.last_name||'');
        if (!tenantPayMap[p.tenant_id]) tenantPayMap[p.tenant_id] = { name, amount:0, paid:true };
        tenantPayMap[p.tenant_id].amount += p.amount;
      });
      const topPayers = Object.values(tenantPayMap).sort((a,b) => b.amount-a.amount).slice(0,5).map(t => ({ name:t.name, amount:t.amount, onTime:true }));
      const latePayerMap: Record<string,{name:string;amount:number;periods:string[]}> = {};
      overdue.forEach((p:any) => {
        const name = (p.tenants?.first_name||'') + ' ' + (p.tenants?.last_name||'');
        if (!latePayerMap[p.tenant_id]) latePayerMap[p.tenant_id] = { name, amount:0, periods:[] };
        latePayerMap[p.tenant_id].amount += p.amount;
        latePayerMap[p.tenant_id].periods.push(p.period_month+'/'+p.period_year);
      });
      const latePayers = Object.values(latePayerMap).slice(0,5).map(t => ({ name:t.name, amount:t.amount, periods:t.periods.join(', ') }));
      const paidTenantIds = new Set(paid.map((p:any) => p.tenant_id));
      const lateTenantIds = new Set(overdue.map((p:any) => p.tenant_id));

      // Tickets
      const catTickets: Record<string,number> = {};
      T.forEach((t:any) => { catTickets[t.category||'Autre'] = (catTickets[t.category||'Autre']||0) + 1; });
      const ticketsByCategory = Object.entries(catTickets).map(([name,count]) => ({ name, count }));

      // Monthly chart
      const monthlyChart = Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months-1) + i, 1);
        const mo = String(d.getMonth()+1)+'/'+String(d.getFullYear());
        const revenue = paid.filter((p:any) => String(p.period_month)+'/'+String(p.period_year)===mo).reduce((s:number,p:any) => s+p.amount, 0);
        const expenses = E.filter((e:any) => { const ed=new Date(e.date); return String(ed.getMonth()+1)+'/'+String(ed.getFullYear())===mo; }).reduce((s:number,e:any) => s+e.amount, 0);
        const commissions = revenue * (commRate/100);
        return { month: format(d,'MMM yy',{locale:fr}), revenue, expenses, commissions, net: revenue - commissions - expenses };
      });

      // Forecast (moyenne des 3 derniers mois)
      const last3 = monthlyChart.slice(-3);
      const forecastRevenue = Math.round(last3.reduce((s,m) => s+m.revenue,0) / last3.length);
      const forecastExpenses = Math.round(last3.reduce((s,m) => s+m.expenses,0) / last3.length);

      setData({
        currentMonthRevenue, currentMonthExpenses, currentMonthNet,
        prevMonthRevenue, prevMonthExpenses,
        collectionRate, totalProperties: PR.length, totalTenants: L.length,
        commissionRate: commRate, totalCommissions: curPaid.reduce((s:number,p:any) => s+p.amount,0) * (commRate/100),
        collectedRents: paid.reduce((s:number,p:any) => s+p.amount,0),  // total sur la période
        pendingRents: pending.reduce((s:number,p:any) => s+p.amount,0),
        overdueRents: overdue.reduce((s:number,p:any) => s+p.amount,0),
        revenueGrowth, expensesByCategory, totalBailleurExp, totalEntrepriseExp,
        rentedProps, availableProps, occupancyRate, revenuePerProperty,
        activeTenants: L.length, paidTenants: paidTenantIds.size, lateTenants: lateTenantIds.size,
        topPayers, latePayers,
        openTickets: T.filter((t:any) => t.status==='open'||t.status==='in_progress').length,
        resolvedTickets: T.filter((t:any) => t.status==='resolved'||t.status==='closed').length,
        totalTickets: T.length, ticketsByCategory,
        monthlyChart, forecastRevenue, forecastExpenses,
      });
      setLoading(false);
    });
  }, [company?.id, period]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;
  if (!data) return null;

  const Kpi = ({ label, value, sub, color, icon }: { label:string; value:string; sub?:string; color:string; icon:React.ReactNode }) => (
    <div className={`border rounded-2xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<p className="text-xs font-semibold uppercase tracking-wide">{label}</p></div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-80">{sub}</p>}
    </div>
  );

  const GrowthBadge = ({ value }: { value:number }) => (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${value >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {value >= 0 ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}{Math.abs(value)}%
    </span>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Rapport financier" subtitle="Vue complète de votre activité immobilière"/>
        <select value={period} onChange={e => setPeriod(e.target.value)} className={selectCls + ' w-40'}>
          <option value="3">3 derniers mois</option>
          <option value="6">6 derniers mois</option>
          <option value="12">12 derniers mois</option>
        </select>
      </div>

      {/* ═══ 1. RÉSUMÉ EXÉCUTIF ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-blue-500 rounded-full inline-block"/>
          Résumé exécutif — {format(new Date(), 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            Ce mois-ci, l'entreprise a généré <strong>{formatCurrency(data.currentMonthRevenue)}</strong> de revenus
            avec un taux de recouvrement de <strong>{data.collectionRate}%</strong>,
            pour un bénéfice net de <strong>{formatCurrency(data.currentMonthNet)}</strong>.
            {data.revenueGrowth !== 0 && (
              <> Les revenus ont {data.revenueGrowth >= 0 ? 'augmenté' : 'diminué'} de <strong>{Math.abs(data.revenueGrowth)}%</strong> par rapport au mois précédent.</>
            )}
            {' '}Parc immobilier : <strong>{data.totalProperties} biens</strong> avec <strong>{data.activeTenants} locataires actifs</strong>.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Revenus du mois" value={formatCurrency(data.currentMonthRevenue)} sub={`vs ${formatCurrency(data.prevMonthRevenue)} mois préc.`} color="text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800" icon={<DollarSign size={15} className="text-green-600"/>}/>
          <Kpi label="Dépenses du mois" value={formatCurrency(data.currentMonthExpenses)} sub={`vs ${formatCurrency(data.prevMonthExpenses)} mois préc.`} color="text-red-700 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800" icon={<TrendingDown size={15} className="text-red-600"/>}/>
          <Kpi label="Bénéfice net" value={formatCurrency(data.currentMonthNet)} color={data.currentMonthNet>=0?"text-purple-700 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800":"text-red-700 bg-red-50 dark:bg-red-900/20 border-red-100"} icon={<TrendingUp size={15} className="text-purple-600"/>}/>
          <Kpi label="Taux de recouvrement" value={`${data.collectionRate}%`} sub={`${data.paidTenants} payés / ${data.activeTenants} locataires`} color={data.collectionRate>=80?"text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100":"text-amber-700 bg-amber-50 dark:bg-amber-900/20 border-amber-100"} icon={<Percent size={15} className="text-green-600"/>}/>
        </div>
      </div>

      {/* ═══ 2. DÉTAIL REVENUS ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-green-500 rounded-full inline-block"/>
          Détail des revenus
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className={cardCls+' p-4'}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Loyers collectés</p>
              <GrowthBadge value={data.revenueGrowth}/>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(data.collectedRents)}</p>
          </div>
          <div className={cardCls+' p-4'}>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Commissions ({data.commissionRate}%)</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.totalCommissions)}</p>
          </div>
          <div className={cardCls+' p-4'}>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">En attente / Retard</p>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(data.pendingRents)}</p>
            {data.overdueRents > 0 && <p className="text-sm font-semibold text-red-600 mt-1">{formatCurrency(data.overdueRents)} en retard</p>}
          </div>
        </div>
      </div>

      {/* ═══ 3. DÉTAIL DÉPENSES ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-red-500 rounded-full inline-block"/>
          Détail des dépenses
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={cardCls+' p-5'}>
            <div className="flex justify-between mb-4">
              <div><p className="text-xs text-muted-foreground uppercase font-semibold">Bailleur</p><p className="text-xl font-bold text-orange-700">{formatCurrency(data.totalBailleurExp)}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground uppercase font-semibold">Entreprise</p><p className="text-xl font-bold text-blue-700">{formatCurrency(data.totalEntrepriseExp)}</p></div>
            </div>
            <div className="space-y-2">
              {data.expensesByCategory.slice(0,6).map((e,i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:e.color}}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="text-foreground truncate">{e.name}</span>
                      <span className="text-muted-foreground ml-2">{formatCurrency(e.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                      <div className="h-1.5 rounded-full" style={{background:e.color, width:`${Math.round((e.amount/(data.totalBailleurExp+data.totalEntrepriseExp||1))*100)}%`}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={cardCls+' p-5'}>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Répartition par catégorie</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.expensesByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="amount" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {data.expensesByCategory.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v:number) => formatCurrency(v)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ 4. RÉSULTAT NET ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-purple-500 rounded-full inline-block"/>
          Résultat net
        </h2>
        <div className={`border-2 rounded-2xl p-6 ${data.currentMonthNet >= 0 ? 'border-purple-200 bg-purple-50 dark:bg-purple-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Revenus − Commissions − Dépenses</p>
              <div className="flex items-center gap-3 flex-wrap text-sm font-mono">
                <span className="text-green-700 font-semibold">{formatCurrency(data.currentMonthRevenue)}</span>
                <span className="text-muted-foreground">−</span>
                <span className="text-blue-700 font-semibold">{formatCurrency(data.currentMonthRevenue*(data.commissionRate/100))}</span>
                <span className="text-muted-foreground">−</span>
                <span className="text-red-700 font-semibold">{formatCurrency(data.currentMonthExpenses)}</span>
                <span className="text-muted-foreground">=</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Bénéfice net du mois</p>
              <p className={`text-4xl font-bold ${data.currentMonthNet >= 0 ? 'text-purple-700' : 'text-red-700'}`}>{formatCurrency(data.currentMonthNet)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 5. PERFORMANCE BIENS ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-blue-500 rounded-full inline-block"/>
          Performance des biens
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Kpi label="Biens loués" value={String(data.rentedProps)} sub={`/ ${data.totalProperties} biens`} color="text-blue-700 bg-blue-50 dark:bg-blue-900/20 border-blue-100" icon={<Home size={15} className="text-blue-600"/>}/>
          <Kpi label="Disponibles" value={String(data.availableProps)} color="text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100" icon={<Home size={15} className="text-green-600"/>}/>
          <Kpi label="Taux d'occupation" value={`${data.occupancyRate}%`} color={data.occupancyRate>=80?"text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100":"text-amber-700 bg-amber-50 dark:bg-amber-900/20 border-amber-100"} icon={<Percent size={15} className="text-blue-600"/>}/>
        </div>
        {data.revenuePerProperty.length > 0 && (
          <div className={cardCls+' p-5'}>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Revenus par bien</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.revenuePerProperty} barSize={28}>
                <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v:number) => formatCurrency(v)}/>
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} name="Revenus"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ═══ 6. SUIVI LOCATAIRES ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-green-500 rounded-full inline-block"/>
          Suivi des locataires
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Kpi label="Locataires actifs" value={String(data.activeTenants)} color="text-blue-700 bg-blue-50 dark:bg-blue-900/20 border-blue-100" icon={<Users size={15} className="text-blue-600"/>}/>
          <Kpi label="Paiements à jour" value={String(data.paidTenants)} color="text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100" icon={<CheckCircle size={15} className="text-green-600"/>}/>
          <Kpi label="En retard" value={String(data.lateTenants)} color={data.lateTenants>0?"text-red-700 bg-red-50 dark:bg-red-900/20 border-red-100":"text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100"} icon={<AlertTriangle size={15} className="text-red-600"/>}/>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.topPayers.length > 0 && (
            <div className={cardCls+' p-5'}>
              <p className="text-xs font-semibold text-green-600 uppercase mb-3 flex items-center gap-1"><CheckCircle size={12}/> Top bons payeurs</p>
              <div className="space-y-2">
                {data.topPayers.map((t,i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">#{i+1}</span>
                      <span className="text-sm font-medium text-foreground">{t.name}</span>
                    </div>
                    <span className="text-sm font-bold text-green-700">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.latePayers.length > 0 && (
            <div className={cardCls+' p-5'}>
              <p className="text-xs font-semibold text-red-600 uppercase mb-3 flex items-center gap-1"><AlertTriangle size={12}/> Alertes retards</p>
              <div className="space-y-2">
                {data.latePayers.map((t,i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">Période(s) : {t.periods}</p>
                    </div>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 7. TICKETS ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-orange-500 rounded-full inline-block"/>
          Signalements & maintenance
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Kpi label="Tickets ouverts" value={String(data.openTickets)} color={data.openTickets>0?"text-orange-700 bg-orange-50 dark:bg-orange-900/20 border-orange-100":"text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100"} icon={<Clock size={15} className="text-orange-600"/>}/>
          <Kpi label="Résolus" value={String(data.resolvedTickets)} color="text-green-700 bg-green-50 dark:bg-green-900/20 border-green-100" icon={<CheckCircle size={15} className="text-green-600"/>}/>
          <Kpi label="Total signalements" value={String(data.totalTickets)} color="text-blue-700 bg-blue-50 dark:bg-blue-900/20 border-blue-100" icon={<Wrench size={15} className="text-blue-600"/>}/>
        </div>
        {data.ticketsByCategory.length > 0 && (
          <div className={cardCls+' p-5'}>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Par type de problème</p>
            <div className="flex flex-wrap gap-2">
              {data.ticketsByCategory.map((t,i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl">
                  <Wrench size={12} className="text-muted-foreground"/>
                  <span className="text-sm text-foreground">{t.name}</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 8. KPIs ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-indigo-500 rounded-full inline-block"/>
          Indicateurs clés (KPI)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cardCls+' p-4 text-center'}>
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Taux de recouvrement</p>
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={data.collectionRate>=80?"#22c55e":"#f59e0b"} strokeWidth="3" strokeDasharray={`${data.collectionRate} ${100-data.collectionRate}`} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">{data.collectionRate}%</span>
              </div>
            </div>
          </div>
          <div className={cardCls+' p-4 text-center'}>
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Taux d'occupation</p>
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${data.occupancyRate} ${100-data.occupancyRate}`} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">{data.occupancyRate}%</span>
              </div>
            </div>
          </div>
          <div className={cardCls+' p-4 text-center'}>
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Rentabilité nette</p>
            <p className={`text-2xl font-bold mt-4 ${data.currentMonthNet>=0?'text-purple-700':'text-red-700'}`}>{formatCurrency(data.currentMonthNet)}</p>
            <p className="text-xs text-muted-foreground mt-1">ce mois</p>
          </div>
          <div className={cardCls+' p-4 text-center'}>
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Croissance revenus</p>
            <div className="flex items-center justify-center mt-4">
              <GrowthBadge value={data.revenueGrowth}/>
            </div>
            <p className="text-xs text-muted-foreground mt-2">vs mois précédent</p>
          </div>
        </div>
      </div>

      {/* ═══ 9. GRAPHIQUE ÉVOLUTION ═══ */}
      <div className={cardCls+' p-5'}>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-slate-400 rounded-full inline-block"/>
          Évolution sur {period} mois
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.monthlyChart} barSize={12}>
            <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v:number) => formatCurrency(v)}/>
            <Legend iconSize={10} wrapperStyle={{fontSize:12}}/>
            <Bar dataKey="revenue" fill="#22c55e" radius={[3,3,0,0]} name="Revenus"/>
            <Bar dataKey="commissions" fill="#3b82f6" radius={[3,3,0,0]} name="Commissions"/>
            <Bar dataKey="expenses" fill="#f97316" radius={[3,3,0,0]} name="Dépenses"/>
            <Bar dataKey="net" fill="#a855f7" radius={[3,3,0,0]} name="Net"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ═══ 10. PRÉVISIONS ═══ */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-teal-500 rounded-full inline-block"/>
          Prévisions mois prochain
          <span className="text-xs font-normal text-muted-foreground">(basées sur la moyenne des {period} derniers mois)</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-teal-600 uppercase mb-1">Revenus estimés</p>
            <p className="text-2xl font-bold text-teal-700">{formatCurrency(data.forecastRevenue)}</p>
            <p className="text-xs text-teal-600 mt-1">Basé sur la tendance actuelle</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-orange-600 uppercase mb-1">Dépenses prévues</p>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(data.forecastExpenses)}</p>
            <p className="text-xs text-orange-600 mt-1">Si tendance se maintient</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Bénéfice net prévu</p>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(Math.max(0, data.forecastRevenue - data.forecastRevenue*(data.commissionRate/100) - data.forecastExpenses))}</p>
            <p className="text-xs text-purple-600 mt-1">Après commissions & dépenses</p>
          </div>
        </div>
      </div>
    </div>
  );
}