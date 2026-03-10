'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, StatCard, LoadingSpinner } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, CreditCard, Home } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AnalyticsPage(){
  const{company}=useAuthStore();
  const[chart,setChart]=useState<{month:string;revenue:number;expenses:number;profit:number}[]>([]);
  const[catData,setCatData]=useState<{name:string;value:number;color:string}[]>([]);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!company?.id)return;
    const sb=createClient();const cid=company.id;
    Promise.all([
      sb.from('rent_payments').select('amount,status,period_month,period_year').eq('company_id',cid).eq('status','paid').limit(500),
      sb.from('expenses').select('amount,date,category').eq('company_id',cid).limit(500),
    ]).then(([{data:pay},{data:exp}])=>{
      const now=new Date();
      const months=Array.from({length:12},(_,i)=>{
        const d=new Date(now.getFullYear(),now.getMonth()-11+i,1);
        const mo=String(d.getMonth()+1)+'/'+String(d.getFullYear());
        const rev=(pay||[]).filter(p=>String(p.period_month)+'/'+String(p.period_year)===mo).reduce((s,p)=>s+p.amount,0);
        const expAmt=(exp||[]).filter(e=>{const ed=new Date(e.date);return String(ed.getMonth()+1)+'/'+String(ed.getFullYear())===mo;}).reduce((s,e)=>s+e.amount,0);
        return{month:format(d,'MMM yy',{locale:fr}),revenue:rev,expenses:expAmt,profit:rev-expAmt};
      });
      setChart(months);
      const cats:Record<string,number>={};
      (exp||[]).forEach(e=>{cats[e.category]=(cats[e.category]||0)+e.amount;});
      const colors=['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
      const catLabels:Record<string,string>={fuel:'Carburant',electricity:'Électricité',supplies:'Fournitures',maintenance:'Maintenance',taxes:'Taxes',insurance:'Assurance',other:'Autre'};
      setCatData(Object.entries(cats).map(([k,v],i)=>({name:catLabels[k]||k,value:v,color:colors[i%colors.length]})));
      setLoading(false);
    });
  },[company?.id]);

  if(loading)return<div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;
  const last=chart[chart.length-1];
  const prev=chart[chart.length-2];
  const trend=prev?.revenue>0?Math.round(((last?.revenue||0)-(prev?.revenue||0))/(prev?.revenue||1)*100):0;

  return(
    <div className="space-y-6">
      <PageHeader title="Analyse financière" subtitle="12 derniers mois"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenus (mois)" value={formatCurrency(last?.revenue||0)} icon={<CreditCard size={20}/>} color="blue" trend={{value:trend,label:'vs mois dernier'}}/>
        <StatCard title="Dépenses (mois)" value={formatCurrency(last?.expenses||0)} icon={<TrendingDown size={20}/>} color="red"/>
        <StatCard title="Bénéfice (mois)" value={formatCurrency(last?.profit||0)} icon={<TrendingUp size={20}/>} color={(last?.profit||0)>=0?'green':'red'}/>
        <StatCard title="Total annuel" value={formatCurrency(chart.reduce((s,m)=>s+m.revenue,0))} icon={<Home size={20}/>} color="purple"/>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Revenus &amp; dépenses — 12 mois</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chart}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v:number)=>formatCurrency(v)}/>
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#gRev)" name="Revenus" strokeWidth={2}/>
            <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#gExp)" name="Dépenses" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {catData.length>0&&(
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Dépenses par catégorie</h3>
          <div className="flex items-center gap-6 flex-wrap">
            <PieChart width={160} height={160}><Pie data={catData} cx={76} cy={76} outerRadius={70} dataKey="value">{catData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart>
            <div className="space-y-2">{catData.map(d=>(<div key={d.name} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/><span className="text-muted-foreground">{d.name}</span><span className="font-medium text-foreground ml-2">{formatCurrency(d.value)}</span></div>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
