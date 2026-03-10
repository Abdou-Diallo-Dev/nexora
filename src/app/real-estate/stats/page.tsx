'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, StatCard, LoadingSpinner } from '@/components/ui';
import { formatCurrency, calculateOccupancyRate } from '@/lib/utils';
import { Home, Users, CreditCard, Wrench, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StatsPage(){
  const{company}=useAuthStore();
  const[d,setD]=useState<{props:number;rented:number;tenants:number;revenue:number;expenses:number;tickets:number;chart:{month:string;revenue:number;expenses:number}[]}|null>(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!company?.id)return;
    const sb=createClient();const cid=company.id;
    Promise.all([
      sb.from('properties').select('id,status').eq('company_id',cid),
      sb.from('tenants').select('id').eq('company_id',cid),
      sb.from('rent_payments').select('amount,status,period_month,period_year').eq('company_id',cid).limit(300),
      sb.from('expenses').select('amount,date').eq('company_id',cid).limit(300),
      sb.from('maintenance_tickets').select('id,status').eq('company_id',cid),
    ]).then(([{data:p},{data:t},{data:pay},{data:exp},{data:tick}])=>{
      const now=new Date();
      const chart=Array.from({length:6},(_,i)=>{
        const dd=new Date(now.getFullYear(),now.getMonth()-5+i,1);
        const mo=String(dd.getMonth()+1)+'/'+String(dd.getFullYear());
        const rev=(pay||[]).filter(x=>x.status==='paid'&&String(x.period_month)+'/'+String(x.period_year)===mo).reduce((s,x)=>s+x.amount,0);
        const expAmt=(exp||[]).filter(x=>{const ed=new Date(x.date);return String(ed.getMonth()+1)+'/'+String(ed.getFullYear())===mo;}).reduce((s,x)=>s+x.amount,0);
        return{month:format(dd,'MMM',{locale:fr}),revenue:rev,expenses:expAmt};
      });
      const thisMonth=String(now.getMonth()+1)+'/'+String(now.getFullYear());
      setD({
        props:(p||[]).length,rented:(p||[]).filter(x=>x.status==='rented').length,tenants:(t||[]).length,
        revenue:(pay||[]).filter(x=>x.status==='paid'&&String(x.period_month)+'/'+String(x.period_year)===thisMonth).reduce((s,x)=>s+x.amount,0),
        expenses:(exp||[]).filter(x=>{const ed=new Date(x.date);return String(ed.getMonth()+1)+'/'+String(ed.getFullYear())===thisMonth;}).reduce((s,x)=>s+x.amount,0),
        tickets:(tick||[]).filter(x=>x.status==='open'||x.status==='in_progress').length,
        chart,
      });
      setLoading(false);
    });
  },[company?.id]);

  if(loading)return<div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;
  if(!d)return null;
  const profit=d.revenue-d.expenses;

  return(
    <div className="space-y-6">
      <PageHeader title="Statistiques" subtitle="Aperçu global de votre activité"/>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Taux d'occupation" value={calculateOccupancyRate(d.props,d.rented)+'%'} icon={<Home size={20}/>} color="blue" subtitle={d.rented+' / '+d.props+' biens loués'}/>
        <StatCard title="Locataires" value={d.tenants} icon={<Users size={20}/>} color="green"/>
        <StatCard title="Revenus du mois" value={formatCurrency(d.revenue)} icon={<CreditCard size={20}/>} color="purple"/>
        <StatCard title="Dépenses du mois" value={formatCurrency(d.expenses)} icon={<TrendingDown size={20}/>} color="red"/>
        <StatCard title="Bénéfice net" value={formatCurrency(profit)} icon={<TrendingUp size={20}/>} color={profit>=0?'green':'red'}/>
        <StatCard title="Tickets ouverts" value={d.tickets} icon={<Wrench size={20}/>} color="orange"/>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Revenus vs Dépenses — 6 mois</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={d.chart} barSize={20} barGap={4}>
            <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v:number)=>formatCurrency(v)}/>
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} name="Revenus"/>
            <Bar dataKey="expenses" fill="#ef4444" radius={[4,4,0,0]} name="Dépenses"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
