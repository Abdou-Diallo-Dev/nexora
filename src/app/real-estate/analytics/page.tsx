'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, selectCls } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, CreditCard, Percent, Building2, ArrowUp, ArrowDown, AlertTriangle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
const QUICK = [
  { label: 'Ce mois', value: 'month' },
  { label: '3 mois',  value: '3' },
  { label: '6 mois',  value: '6' },
  { label: '1 an',    value: '12' },
];

interface CatItem  { name: string; value: number; color: string }
interface ChartItem { month: string; revenue: number; expenses: number; commissions: number; net: number }

export default function AnalyticsPage() {
  const { company } = useAuthStore();
  const [loading, setLoading]               = useState(true);
  const [quick, setQuick]                   = useState('3');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterTenant, setFilterTenant]     = useState('');
  const [properties, setProperties]         = useState<{ id: string; name: string }[]>([]);
  const [tenants, setTenants]               = useState<{ id: string; name: string }[]>([]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [exporting, setExporting]           = useState(false);

  const [totals, setTotals] = useState({
    revenue: 0, prevRevenue: 0,
    depenses: 0, prevDepenses: 0,
    commissions: 0, restitue: 0,
    recouvrement: 0, impayeRate: 0, cashFlow: 0,
  });
  const [chart, setChart]     = useState<ChartItem[]>([]);
  const [catData, setCatData] = useState<CatItem[]>([]);

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true);
    try {
      const mod = await import('@/lib/exportPDF');
      await mod.exportStatsPDF(
        {
          rented: 0, props: 0, available: 0, occupancy: 0,
          tenants: 0, activeTenants: 0,
          revenue: totals.revenue, prevRevenue: totals.prevRevenue,
          expenses: totals.depenses, commissions: totals.commissions,
          net: totals.cashFlow, collectionRate: totals.recouvrement,
          impayeRate: totals.impayeRate, chart, expCats: catData,
          commissionRate, period: quick === 'month' ? 1 : parseInt(quick),
        },
        company?.name || 'Nexora',
        (company as any)?.logo_url   || null,
        (company as any)?.primary_color || null,
      );
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  // ── Static data (properties / tenants / commission rate) ────────────────────
  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('properties').select('id,name').eq('company_id', company.id).order('name')
      .then(({ data }) => setProperties((data || []) as { id: string; name: string }[]));
    sb.from('tenants').select('id,first_name,last_name').eq('company_id', company.id).order('first_name')
      .then(({ data }) =>
        setTenants(((data || []) as any[]).map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}` })))
      );
    sb.from('companies').select('commission_rate').eq('id', company.id).maybeSingle()
      .then(({ data }) => setCommissionRate((data as any)?.commission_rate ?? 10));
  }, [company?.id]);

  // ── Analytics data ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);

    const run = async () => {
      const sb      = createClient();
      const cid     = company.id;
      const now     = new Date();
      const months  = quick === 'month' ? 1 : parseInt(quick);
      const start   = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      const rate        = commissionRate / 100;
      const rateWithTVA = rate * 1.18; // TTC

      // ── Lease IDs for property filter ──────────────────────────────────────
      const leaseIdsForProperty: string[] = [];
      if (filterProperty) {
        const { data: leaseRows } = await sb
          .from('leases')
          .select('id')
          .eq('property_id', filterProperty)
          .eq('company_id', cid);
        (leaseRows || []).forEach((l: any) => leaseIdsForProperty.push(l.id));
      }

      // Early-exit if property filter yields no leases
      if (filterProperty && leaseIdsForProperty.length === 0) {
        setTotals({ revenue:0, prevRevenue:0, depenses:0, prevDepenses:0, commissions:0, restitue:0, recouvrement:0, impayeRate:0, cashFlow:0 });
        setChart([]); setCatData([]); setLoading(false);
        return;
      }

      // ── Queries ────────────────────────────────────────────────────────────
      let payQ = sb
        .from('rent_payments')
        .select('amount,status,period_month,period_year,tenant_id,lease_id')
        .eq('company_id', cid)
        .limit(1000);
      if (filterProperty && leaseIdsForProperty.length > 0)
        payQ = payQ.in('lease_id', leaseIdsForProperty);
      if (filterTenant)
        payQ = payQ.eq('tenant_id', filterTenant);

      const expQ = sb
        .from('expenses')
        .select('amount,date,category,type')
        .eq('company_id', cid)
        .limit(500);

      const [{ data: pay }, { data: exp }] = await Promise.all([payQ, expQ]);

      // ── Period helpers ─────────────────────────────────────────────────────
      const inPeriod = (p: any) => {
        const d = new Date(p.period_year, p.period_month - 1, 1);
        return d >= start && d <= now;
      };
      const moKey = (d: Date) => `${d.getMonth() + 1}/${d.getFullYear()}`;

      const curMo  = moKey(now);
      const prevMo = moKey(subMonths(now, 1));

      const allPeriod  = (pay || []).filter(inPeriod);
      const paid       = allPeriod.filter((p: any) => p.status === 'paid' || p.status === 'partial');
      const overdue    = allPeriod.filter((p: any) => p.status === 'late'  || p.status === 'overdue');

      const periodExp = (exp || []).filter((e: any) => {
        const d = new Date(e.date);
        return d >= start && d <= now;
      });

      // ── KPI helpers ────────────────────────────────────────────────────────
      const sumRev = (moK: string) =>
        paid
          .filter((p: any) => moKey(new Date(p.period_year, p.period_month - 1, 1)) === moK)
          .reduce((s: number, p: any) => s + p.amount, 0);

      const sumExp = (moK: string) =>
        periodExp
          .filter((e: any) => moKey(new Date(e.date)) === moK)
          .reduce((s: number, e: any) => s + e.amount, 0);

      const totalRevenue  = paid.reduce((s: number, p: any) => s + p.amount, 0);
      const totalDep      = periodExp.reduce((s: number, e: any) => s + e.amount, 0);
      const totalComm     = totalRevenue * rateWithTVA;
      const bailleurDep   = (exp || []).filter((e: any) => e.type === 'bailleur').reduce((s: number, e: any) => s + e.amount, 0);
      const cashFlow      = totalRevenue - totalDep;
      const recouvrement  = allPeriod.length > 0 ? Math.round((paid.length   / allPeriod.length) * 100) : 0;
      const impayeRate    = allPeriod.length > 0 ? Math.round((overdue.length / allPeriod.length) * 100) : 0;

      setTotals({
        revenue:      sumRev(curMo),
        prevRevenue:  sumRev(prevMo),
        depenses:     sumExp(curMo),
        prevDepenses: sumExp(prevMo),
        commissions:  totalComm,
        restitue:     Math.max(0, totalRevenue - totalComm - bailleurDep),
        recouvrement,
        impayeRate,
        cashFlow,
      });

      // ── Chart ──────────────────────────────────────────────────────────────
      const monthsArr: ChartItem[] = Array.from({ length: months }, (_, i) => {
        const d   = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
        const moK = moKey(d);
        const revenue     = sumRev(moK);
        const expenses    = sumExp(moK);
        const commissions = revenue * rateWithTVA;
        return {
          month: format(d, 'MMM yy', { locale: fr }),
          revenue,
          expenses,
          commissions,
          net: revenue - commissions - expenses,
        };
      });
      setChart(monthsArr);

      // ── Categories ─────────────────────────────────────────────────────────
      const cats: Record<string, number> = {};
      periodExp.forEach((e: any) => {
        const k = e.category || 'Autre';
        cats[k] = (cats[k] || 0) + e.amount;
      });
      setCatData(
        Object.entries(cats)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
      );

      setLoading(false);
    };

    run();
  }, [company?.id, quick, filterProperty, filterTenant, commissionRate]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const revenueGrowth = totals.prevRevenue  > 0 ? Math.round(((totals.revenue   - totals.prevRevenue)  / totals.prevRevenue)  * 100) : 0;
  const depGrowth     = totals.prevDepenses > 0 ? Math.round(((totals.depenses  - totals.prevDepenses) / totals.prevDepenses) * 100) : 0;

  const GrowthBadge = ({ val }: { val: number }) => (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {val >= 0 ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
      {Math.abs(val)}% vs mois préc.
    </span>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <PageHeader title="Analyse financière" subtitle="Revenus, dépenses et commissions"/>
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <Download size={15}/>{exporting ? 'Export...' : 'Export PDF'}
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {QUICK.map(q => (
            <button
              key={q.value}
              onClick={() => setQuick(q.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                quick === q.value
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-muted-foreground hover:bg-slate-200'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">🏠 Bien immobilier</label>
            <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className={selectCls + ' w-full'}>
              <option value="">Tous les biens</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">👤 Locataire</label>
            <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)} className={selectCls + ' w-full'}>
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
          <div className="flex items-center gap-2 mb-1 text-blue-600"><Percent size={14}/><p className="text-xs font-semibold uppercase">Commission TTC (HT {commissionRate}%+TVA 18%)</p></div>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totals.commissions)}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1 text-purple-600"><Building2 size={14}/><p className="text-xs font-semibold uppercase">Cash flow net</p></div>
          <p className={`text-2xl font-bold ${totals.cashFlow >= 0 ? 'text-purple-700' : 'text-red-700'}`}>{formatCurrency(totals.cashFlow)}</p>
          <p className="text-xs text-muted-foreground">Revenus − Dépenses</p>
        </div>
        <div className={`border rounded-2xl p-4 ${totals.recouvrement >= 80 ? 'bg-green-50 dark:bg-green-900/20 border-green-100' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100'}`}>
          <div className={`flex items-center gap-2 mb-1 ${totals.recouvrement >= 80 ? 'text-green-600' : 'text-amber-600'}`}><TrendingUp size={14}/><p className="text-xs font-semibold uppercase">Taux de recouvrement</p></div>
          <p className={`text-2xl font-bold ${totals.recouvrement >= 80 ? 'text-green-700' : 'text-amber-700'}`}>{totals.recouvrement}%</p>
        </div>
        <div className={`border rounded-2xl p-4 ${totals.impayeRate === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100' : 'bg-red-50 dark:bg-red-900/20 border-red-100'}`}>
          <div className={`flex items-center gap-2 mb-1 ${totals.impayeRate === 0 ? 'text-green-600' : 'text-red-600'}`}><AlertTriangle size={14}/><p className="text-xs font-semibold uppercase">Taux d'impayés</p></div>
          <p className={`text-2xl font-bold ${totals.impayeRate === 0 ? 'text-green-700' : 'text-red-700'}`}>{totals.impayeRate}%</p>
        </div>
      </div>

      {/* Graphique barres */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Évolution mensuelle</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart} barSize={12}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v => (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v: number) => formatCurrency(v)}/>
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }}/>
            <Bar dataKey="revenue"     fill="#22c55e" radius={[3,3,0,0]} name="Revenus"/>
            <Bar dataKey="commissions" fill="#3b82f6" radius={[3,3,0,0]} name="Commissions"/>
            <Bar dataKey="expenses"    fill="#f97316" radius={[3,3,0,0]} name="Dépenses"/>
            <Bar dataKey="net"         fill="#a855f7" radius={[3,3,0,0]} name="Net"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Courbe de croissance */}
      <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Courbe de croissance</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chart}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v => (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v: number) => formatCurrency(v)}/>
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }}/>
            <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Revenus"/>
            <Line type="monotone" dataKey="net"     stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} name="Net"/>
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
                <Pie
                  data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}
                >
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Détail</h3>
            <div className="space-y-3">
              {catData.map((d, i) => {
                const total = catData.reduce((s, c) => s + c.value, 0);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{d.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(d.value)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                        <div className="h-1.5 rounded-full" style={{ background: d.color, width: `${Math.round((d.value / total) * 100)}%` }}/>
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
  );
}