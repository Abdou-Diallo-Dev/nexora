'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, StatCard, LoadingSpinner } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, CreditCard, Home, Percent, Building2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AnalyticsPage() {
  const { company } = useAuthStore();
  const [chart, setChart] = useState<{ month:string; revenue:number; depenses:number; commissions:number; restitue:number }[]>([]);
  const [catData, setCatData] = useState<{ name:string; value:number; color:string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(10);
  const [totals, setTotals] = useState({ revenue:0, depenses:0, commissions:0, restitue:0, recouvrement:0 });

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient(); const cid = company.id;
    Promise.all([
      sb.from('rent_payments').select('amount,status,period_month,period_year').eq('company_id', cid).limit(500),
      sb.from('expenses').select('amount,date,category,type').eq('company_id', cid).limit(500),
      sb.from('companies').select('commission_rate').eq('id', cid).maybeSingle(),
    ]).then(([{ data: pay }, { data: exp }, { data: comp }]) => {
      const rate = (comp?.commission_rate ?? 10) / 100;
      setCommissionRate(comp?.commission_rate ?? 10);
      const paid = (pay || []).filter((p: any) => p.status === 'paid');
      const all = pay || [];
      const totalRev = paid.reduce((s: number, p: any) => s + p.amount, 0);
      const totalDep = (exp || []).reduce((s: number, e: any) => s + e.amount, 0);
      const totalComm = totalRev * rate;
      const totalBailleurExp = (exp || []).filter((e: any) => e.type === 'bailleur').reduce((s: number, e: any) => s + e.amount, 0);
      setTotals({
        revenue: totalRev, depenses: totalDep, commissions: totalComm,
        restitue: Math.max(0, totalRev - totalComm - totalBailleurExp),
        recouvrement: all.length > 0 ? Math.round((paid.length / all.length) * 100) : 0,
      });
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const mo = String(d.getMonth()+1)+'/'+String(d.getFullYear());
        const revenue = paid.filter((p: any) => String(p.period_month)+'/'+String(p.period_year)===mo).reduce((s: number, p: any) => s+p.amount, 0);
        const depenses = (exp||[]).filter((e: any) => { const ed=new Date(e.date); return String(ed.getMonth()+1)+'/'+String(ed.getFullYear())===mo; }).reduce((s: number, e: any) => s+e.amount, 0);
        const commissions = revenue * rate;
        return { month: format(d, 'MMM yy', { locale: fr }), revenue, depenses, commissions, restitue: Math.max(0, revenue - commissions - depenses) };
      });
      setChart(months);
      const cats: Record<string, number> = {};
      (exp||[]).forEach((e: any) => { cats[e.category||'Autre'] = (cats[e.category||'Autre']||0) + e.amount; });
      const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
      setCatData(Object.entries(cats).map(([k,v], i) => ({ name: k, value: v, color: colors[i%colors.length] })));
      setLoading(false);
    });
  }, [company?.id]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Analyse financière" subtitle="Revenus, dépenses et commissions"/>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Revenus totaux" value={formatCurrency(totals.revenue)} subtitle="Loyers perçus" icon={<CreditCard size={20}/>} color="green"/>
        <StatCard title={`Commissions (${commissionRate}%)`} value={formatCurrency(totals.commissions)} subtitle="Générées automatiquement" icon={<Percent size={20}/>} color="blue"/>
        <StatCard title="Total dépenses" value={formatCurrency(totals.depenses)} subtitle="Bailleur + entreprise" icon={<TrendingDown size={20}/>} color="orange"/>
        <StatCard title="À reverser bailleurs" value={formatCurrency(totals.restitue)} subtitle="Après déductions" icon={<Building2 size={20}/>} color="purple"/>
        <StatCard title="Taux recouvrement" value={totals.recouvrement+'%'} subtitle="Loyers payés / total" icon={<TrendingUp size={20}/>} color={totals.recouvrement>=80?'green':'orange'}/>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Évolution annuelle — Loyers / Commissions / Dépenses / Reversements</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chart} barSize={10}>
            <XAxis dataKey="month" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v => (v/1000).toFixed(0)+'k'} tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v: number) => formatCurrency(v)}/>
            <Legend iconSize={10} wrapperStyle={{ fontSize:12 }}/>
            <Bar dataKey="revenue" fill="#22c55e" radius={[3,3,0,0]} name="Loyers"/>
            <Bar dataKey="commissions" fill="#3b82f6" radius={[3,3,0,0]} name="Commissions"/>
            <Bar dataKey="depenses" fill="#f97316" radius={[3,3,0,0]} name="Dépenses"/>
            <Bar dataKey="restitue" fill="#a855f7" radius={[3,3,0,0]} name="Reversements"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {catData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Dépenses par catégorie</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {catData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Détail par catégorie</h3>
            <div className="space-y-3">
              {catData.sort((a,b) => b.value-a.value).map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{d.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(d.value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                      <div className="h-1.5 rounded-full" style={{ background: d.color, width: `${Math.round((d.value/totals.depenses)*100)}%` }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}