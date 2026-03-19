'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, selectCls, inputCls } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, CreditCard, Percent, Building2, ArrowUp, ArrowDown, AlertTriangle, Download } from 'lucide-react';
import { useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
const QUICK = [
  { label: 'Ce mois', value: 'month' },
  { label: '3 mois', value: '3' },
  { label: '6 mois', value: '6' },
  { label: '1 an', value: '12' },
];

export default function AnalyticsPage() {
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState('3');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [properties, setProperties] = useState<{id:string;name:string}[]>([]);
  const [tenants, setTenants] = useState<{id:string;name:string}[]>([]);
  const [commissionRate, setCommissionRate] = useState(10);

  const [totals, setTotals] = useState({
    revenue:0, prevRevenue:0, depenses:0, prevDepenses:0,
    commissions:0, restitue:0, recouvrement:0, impayeRate:0, cashFlow:0,
  });
  const [chart, setChart] = useState<any[]>([]);
  const [catData, setCatData] = useState<{name:string;value:number;color:string}[]>([]);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      if (!printRef.current) return;
      const canvas = await html2canvas(printRef.current, { scale:1.5, useCORS:true, backgroundColor:'#ffffff' });
      const pdf = new jsPDF('p','mm','a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height*w)/canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let y=0;
      while(y<h){
        const srcY=(y/h)*canvas.height;
        const srcH=Math.min((pageH/h)*canvas.height,canvas.height-srcY);
        const tmp=document.createElement('canvas');tmp.width=canvas.width;tmp.height=srcH;
        const ctx=tmp.getContext('2d')!;ctx.drawImage(canvas,0,-srcY);
        if(y>0)pdf.addPage();
        pdf.addImage(tmp.toDataURL('image/jpeg',0.85),'JPEG',0,0,w,Math.min(pageH,(srcH/canvas.height)*h));
        y+=pageH;
      }
      pdf.save(`analyse-financiere-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(e){console.error(e);}
    setExporting(false);
  };

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('properties').select('id,name').eq('company_id', company.id).order('name')
      .then(({ data }) => setProperties((data||[]) as any[]));
    sb.from('tenants').select('id,first_name,last_name').eq('company_id', company.id).order('first_name')
      .then(({ data }) => setTenants(((data||[]) as any[]).map(t => ({ id:t.id, name:`${t.first_name} ${t.last_name}` }))));
    sb.from('companies').select('commission_rate').eq('id', company.id).maybeSingle()
      .then(({ data }) => setCommissionRate((data as any)?.commission_rate ?? 10));
  }, [company?.id]);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();
    const cid = company.id;
    const now = new Date();
    const months = quick === 'month' ? 1 : parseInt(quick);

    const now2 = new Date();
    const startDate2 = new Date(now2.getFullYear(), now2.getMonth() - (months-1), 1);
    let payQ = sb.from('rent_payments').select('amount,status,period_month,period_year,tenant_id,lease_id').eq('company_id', cid).limit(1000);
    let expQ = sb.from('expenses').select('amount,date,category,type').eq('company_id', cid).limit(500);

    if (filterProperty) {
      payQ = payQ.eq('lease_id', filterProperty);
    }
    if (filterTenant) {
      payQ = payQ.eq('tenant_id', filterTenant);
    }

    Promise.all([payQ, expQ]).then(([{ data: pay }, { data: exp }]) => {
      const rate = commissionRate / 100;
      const now3 = new Date();
      const startDate3 = new Date(now3.getFullYear(), now3.getMonth() - (months-1), 1);
      const periodFilter = (p:any) => {
        const d = new Date(p.period_year, p.period_month - 1, 1);
        return d >= startDate3 && d <= now3;
      };
      const allRaw = pay||[];
      const periodAll2 = allRaw.filter(periodFilter);
      const paid = periodAll2.filter((p:any) => p.status === 'paid');
      const all = periodAll2;
      const overdue = periodAll2.filter((p:any) => p.status === 'late' || p.status === 'overdue');

      // Current month
      const curMo = String(now.getMonth()+1)+'/'+String(now.getFullYear());
      const prevMo = String(subMonths(now,1).getMonth()+1)+'/'+String(subMonths(now,1).getFullYear());
      const curRevenue = paid.filter((p:any) => String(p.period_month)+'/'+String(p.period_year)===curMo).reduce((s:number,p:any)=>s+p.amount,0);
      const prevRevenue = paid.filter((p:any) => String(p.period_month)+'/'+String(p.period_year)===prevMo).reduce((s:number,p:any)=>s+p.amount,0);
      const totalRevenue = paid.reduce((s:number,p:any)=>s+p.amount,0);
      const periodExp = (exp||[]).filter((e:any) => {
        const d = new Date(e.date);
        const s3 = new Date(now3.getFullYear(), now3.getMonth() - (months-1), 1);
        return d >= s3 && d <= now3;
      });
      const totalDep = periodExp.reduce((s:number,e:any)=>s+e.amount,0);
      const curDep = periodExp.filter((e:any) => { const d=new Date(e.date); return String(d.getMonth()+1)+'/'+String(d.getFullYear())===curMo; }).reduce((s:number,e:any)=>s+e.amount,0);
      const prevDep = periodExp.filter((e:any) => { const d=new Date(e.date); return String(d.getMonth()+1)+'/'+String(d.getFullYear())===prevMo; }).reduce((s:number,e:any)=>s+e.amount,0);
      const totalComm = totalRevenue * rate;
      const totalBailleurDep = (exp||[]).filter((e:any)=>e.type==='bailleur').reduce((s:number,e:any)=>s+e.amount,0);
      const cashFlow = totalRevenue - totalDep;
      const impayeRate = all.length > 0 ? Math.round((overdue.length / all.length) * 100) : 0;
      const recouvrement = all.length > 0 ? Math.round((paid.length / all.length) * 100) : 0;

      setTotals({ revenue:curRevenue, prevRevenue, depenses:curDep, prevDepenses:prevDep, commissions:totalComm, restitue:Math.max(0,totalRevenue-totalComm-totalBailleurDep), recouvrement, impayeRate, cashFlow });

      // Chart
      const monthsArr = Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months-1) + i, 1);
        const mo = String(d.getMonth()+1)+'/'+String(d.getFullYear());
        const revenue = paid.filter((p:any) => String(p.period_month)+'/'+String(p.period_year)===mo).reduce((s:number,p:any)=>s+p.amount,0);
        const expenses = periodExp.filter((e:any) => { const ed=new Date(e.date); return String(ed.getMonth()+1)+'/'+String(ed.getFullYear())===mo; }).reduce((s:number,e:any)=>s+e.amount,0);
        const commissions = revenue * rate;
        return { month: format(d,'MMM yy',{locale:fr}), revenue, expenses, commissions, net: revenue-commissions-expenses };
      });
      setChart(monthsArr);

      // Categories
      const cats: Record<string,number> = {};
      periodExp.forEach((e:any) => { cats[e.category||'Autre'] = (cats[e.category||'Autre']||0)+e.amount; });
      setCatData(Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([name,value],i) => ({ name, value, color:COLORS[i%COLORS.length] })));
      setLoading(false);
    });
  }, [company?.id, quick, filterProperty, filterTenant, commissionRate]);

  const revenueGrowth = totals.prevRevenue > 0 ? Math.round(((totals.revenue-totals.prevRevenue)/totals.prevRevenue)*100) : 0;
  const depGrowth = totals.prevDepenses > 0 ? Math.round(((totals.depenses-totals.prevDepenses)/totals.prevDepenses)*100) : 0;

  const GrowthBadge = ({ val }: { val:number }) => (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${val>=0?'text-green-600':'text-red-600'}`}>
      {val>=0?<ArrowUp size={10}/>:<ArrowDown size={10}/>}{Math.abs(val)}% vs mois préc.
    </span>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageHeader title="Analyse financière" subtitle="Revenus, dépenses et commissions"/>
        <button onClick={exportPDF} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
          <Download size={15}/>{exporting?'Export...':'Export PDF'}
        </button>
      </div>

      <div ref={printRef}>
      {/* Filtres */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-4 space-y-3">
        {/* Quick selector */}
        <div className="flex gap-2 flex-wrap">
          {QUICK.map(q => (
            <button key={q.value} onClick={() => setQuick(q.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${quick===q.value?'bg-primary text-white':'bg-slate-100 dark:bg-slate-700 text-muted-foreground hover:bg-slate-200'}`}>
              {q.label}
            </button>
          ))}
        </div>
        {/* Filtres avancés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">🏠 Bien immobilier</label>
            <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className={selectCls+' w-full'}>
              <option value="">Tous les biens</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">👤 Locataire</label>
            <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)} className={selectCls+' w-full'}>
              <option value="">Tous les locataires</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1 text-green-600"><CreditCard size={14}/><p className="text-xs font-semibold uppercase">Revenus du mois</p></div>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totals.revenue)}</p>
          <GrowthBadge val={revenueGrowth}/>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1 text-red-600"><TrendingDown size={14}/><p className="text-xs font-semibold uppercase">Dépenses du mois</p></div>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totals.depenses)}</p>
          <GrowthBadge val={-depGrowth}/>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1 text-blue-600"><Percent size={14}/><p className="text-xs font-semibold uppercase">Commissions ({commissionRate}%)</p></div>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totals.commissions)}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1 text-purple-600"><Building2 size={14}/><p className="text-xs font-semibold uppercase">Cash flow net</p></div>
          <p className={`text-2xl font-bold ${totals.cashFlow>=0?'text-purple-700':'text-red-700'}`}>{formatCurrency(totals.cashFlow)}</p>
          <p className="text-xs text-muted-foreground">Revenus − Dépenses</p>
        </div>
        <div className={`border rounded-2xl p-4 ${totals.recouvrement>=80?'bg-green-50 dark:bg-green-900/20 border-green-100':'bg-amber-50 dark:bg-amber-900/20 border-amber-100'}`}>
          <div className={`flex items-center gap-2 mb-1 ${totals.recouvrement>=80?'text-green-600':'text-amber-600'}`}><TrendingUp size={14}/><p className="text-xs font-semibold uppercase">Taux de recouvrement</p></div>
          <p className={`text-2xl font-bold ${totals.recouvrement>=80?'text-green-700':'text-amber-700'}`}>{totals.recouvrement}%</p>
        </div>
        <div className={`border rounded-2xl p-4 ${totals.impayeRate===0?'bg-green-50 dark:bg-green-900/20 border-green-100':'bg-red-50 dark:bg-red-900/20 border-red-100'}`}>
          <div className={`flex items-center gap-2 mb-1 ${totals.impayeRate===0?'text-green-600':'text-red-600'}`}><AlertTriangle size={14}/><p className="text-xs font-semibold uppercase">Taux d'impayés</p></div>
          <p className={`text-2xl font-bold ${totals.impayeRate===0?'text-green-700':'text-red-700'}`}>{totals.impayeRate}%</p>
        </div>
      </div>

      {/* Graphique barres */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Évolution mensuelle</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart} barSize={12}>
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

      {/* Courbe d'évolution */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Courbe de croissance</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chart}>
            <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v:number) => formatCurrency(v)}/>
            <Legend iconSize={10} wrapperStyle={{fontSize:12}}/>
            <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{r:4}} name="Revenus"/>
            <Line type="monotone" dataKey="net" stroke="#a855f7" strokeWidth={2} dot={{r:4}} name="Net"/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Camembert dépenses */}
      {catData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Dépenses par catégorie</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {catData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v:number) => formatCurrency(v)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Détail</h3>
            <div className="space-y-3">
              {catData.map((d,i) => {
                const total = catData.reduce((s,c)=>s+c.value,0);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:d.color}}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{d.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(d.value)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                        <div className="h-1.5 rounded-full" style={{background:d.color,width:`${Math.round((d.value/total)*100)}%`}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}