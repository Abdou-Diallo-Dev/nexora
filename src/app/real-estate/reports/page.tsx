'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, FileText, Download, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, cardCls, btnPrimary, selectCls } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

type FinData = {
  totalRevenue: number; totalExpenses: number; netProfit: number;
  collectionRate: number; overdueAmount: number; pendingAmount: number;
  monthlyData: { month:string; revenue:number; expenses:number; profit:number }[];
  byCategory: { name:string; value:number; color:string }[];
  topTenants: { name:string; amount:number; status:string }[];
};

export default function ReportsPage() {
  const { company } = useAuthStore();
  const [data, setData] = useState<FinData|null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6');

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();
    const months = parseInt(period);
    const now = new Date();

    Promise.all([
      sb.from('rent_payments').select('amount,status,period_month,period_year,tenants(first_name,last_name)').eq('company_id', company.id),
      sb.from('expenses').select('amount,category,created_at').eq('company_id', company.id),
    ]).then(([{ data: payments }, { data: expenses }]) => {
      const PAY = payments || [];
      const EXP = expenses || [];

      const paid    = PAY.filter(p => p.status==='paid');
      const overdue = PAY.filter(p => p.status==='overdue'||p.status==='late');
      const pending = PAY.filter(p => p.status==='pending');

      const totalRevenue  = paid.reduce((s,p) => s+(p.amount||0), 0);
      const totalExpenses = EXP.reduce((s,e) => s+(e.amount||0), 0);
      const totalDue      = PAY.reduce((s,p) => s+(p.amount||0), 0);

      // Monthly data
      const monthlyData = Array.from({ length: months }, (_, i) => {
        const d   = new Date(now.getFullYear(), now.getMonth()-months+1+i, 1);
        const mo  = String(d.getMonth()+1)+'/'+String(d.getFullYear());
        const rev = paid.filter(p => String(p.period_month)+'/'+String(p.period_year)===mo).reduce((s,p)=>s+(p.amount||0),0);
        const exp = EXP.filter(e => { const ed = new Date(e.created_at); return ed.getMonth()===d.getMonth() && ed.getFullYear()===d.getFullYear(); }).reduce((s,e)=>s+(e.amount||0),0);
        return { month: format(d,'MMM yy',{locale:fr}), revenue:rev, expenses:exp, profit:rev-exp };
      });

      // By expense category
      const catMap: Record<string,number> = {};
      EXP.forEach(e => { catMap[e.category||'autre'] = (catMap[e.category||'autre']||0)+(e.amount||0); });
      const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
      const byCategory = Object.entries(catMap).map(([name,value],i) => ({ name, value, color:colors[i%colors.length] }));

      // Top tenants by payment
      type PayRow = { amount:number; status:string; tenants?:{first_name:string;last_name:string}|null };
      const tenantMap: Record<string,{amount:number;status:string}> = {};
      (paid as PayRow[]).forEach(p => {
        const name = p.tenants ? p.tenants.first_name+' '+p.tenants.last_name : 'Inconnu';
        if (!tenantMap[name]) tenantMap[name] = { amount:0, status:'paid' };
        tenantMap[name].amount += p.amount||0;
      });
      const topTenants = Object.entries(tenantMap).sort((a,b)=>b[1].amount-a[1].amount).slice(0,5).map(([name,{amount,status}])=>({name,amount,status}));

      setData({
        totalRevenue, totalExpenses, netProfit: totalRevenue-totalExpenses,
        collectionRate: totalDue>0 ? Math.round((totalRevenue/totalDue)*100) : 0,
        overdueAmount: overdue.reduce((s,p)=>s+(p.amount||0),0),
        pendingAmount: pending.reduce((s,p)=>s+(p.amount||0),0),
        monthlyData, byCategory, topTenants,
      });
      setLoading(false);
    });
  }, [company?.id, period]);

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner size={36}/></div>;
  if (!data) return null;

  const kpis = [
    { label:'Revenus totaux',  value:formatCurrency(data.totalRevenue),  icon:<TrendingUp size={18}/>,  color:'text-green-600 bg-green-50', border:'border-green-100' },
    { label:'Depenses totales',value:formatCurrency(data.totalExpenses), icon:<TrendingDown size={18}/>,color:'text-red-600 bg-red-50',     border:'border-red-100' },
    { label:'Benefice net',    value:formatCurrency(data.netProfit),     icon:<DollarSign size={18}/>,  color:data.netProfit>=0?'text-blue-600 bg-blue-50':'text-red-600 bg-red-50', border:data.netProfit>=0?'border-blue-100':'border-red-100' },
    { label:'Taux de collecte',value:data.collectionRate+'%',            icon:<BarChart3 size={18}/>,   color:'text-purple-600 bg-purple-50',border:'border-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapports Financiers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analyse complete des finances de l'entreprise</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground"/>
            <select value={period} onChange={e=>setPeriod(e.target.value)} className={selectCls+' w-36'}>
              <option value="3">3 derniers mois</option>
              <option value="6">6 derniers mois</option>
              <option value="12">12 derniers mois</option>
            </select>
          </div>
          <button className={btnPrimary}><Download size={15}/>Exporter PDF</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={cardCls+' p-5 border '+k.border}>
            <div className={'w-9 h-9 rounded-xl flex items-center justify-center mb-3 '+k.color}>
              {k.icon}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className="text-xl font-bold text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(data.overdueAmount>0||data.pendingAmount>0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.overdueAmount>0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingDown size={16} className="text-red-600"/>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Loyers en retard</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(data.overdueAmount)}</p>
              </div>
            </div>
          )}
          {data.pendingAmount>0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign size={16} className="text-amber-600"/>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Paiements en attente</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(data.pendingAmount)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue vs Expenses */}
        <div className={cardCls+' lg:col-span-2 p-5'}>
          <h3 className="font-semibold text-foreground mb-4">Revenus vs Depenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyData} barSize={16}>
              <XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v:number)=>formatCurrency(v)}/>
              <Bar dataKey="revenue"  fill="#22c55e" radius={[3,3,0,0]} name="Revenus"/>
              <Bar dataKey="expenses" fill="#ef4444" radius={[3,3,0,0]} name="Depenses"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense categories */}
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-4">Depenses par categorie</h3>
          {data.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune depense</p>
          ) : (
            <>
              <PieChart width={140} height={140} className="mx-auto">
                <Pie data={data.byCategory} cx={66} cy={66} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {data.byCategory.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
              </PieChart>
              <div className="space-y-2 mt-3">
                {data.byCategory.map(c=>(
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{background:c.color}}/>
                      <span className="text-muted-foreground capitalize">{c.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Net profit trend */}
      <div className={cardCls+' p-5'}>
        <h3 className="font-semibold text-foreground mb-4">Evolution du benefice net</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.monthlyData}>
            <XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v:number)=>formatCurrency(v)}/>
            <Line dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} name="Benefice"/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top tenants */}
      {data.topTenants.length > 0 && (
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-4">Top locataires par paiement</h3>
          <div className="space-y-3">
            {data.topTenants.map((t,i) => (
              <div key={t.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                    <div className="bg-primary h-1.5 rounded-full" style={{width: Math.min(100,(t.amount/data.topTenants[0].amount)*100)+'%'}}/>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground flex-shrink-0">{formatCurrency(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}