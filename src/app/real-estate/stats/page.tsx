'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateCommission, computeLandlordNet, getCommissionSummaryLabel } from '@/lib/commission';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, selectCls } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { Home, Users, CreditCard, TrendingUp, TrendingDown, Percent, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function StatsPage() {
  const { company } = useAuthStore();
  const [period, setPeriod] = useState('6');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [d, setD] = useState<any | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();
    const cid = company.id;
    const months = parseInt(period);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const moKey = (date: Date) => `${date.getMonth() + 1}/${date.getFullYear()}`;
    const prevMo = moKey(subMonths(now, 1));

    Promise.all([
      sb.from('properties').select('id,status').eq('company_id', cid),
      sb.from('tenants').select('id,status').eq('company_id', cid),
      sb.from('rent_payments').select('amount,paid_amount,status,period_month,period_year').eq('company_id', cid).limit(1000),
      sb.from('expenses').select('amount,date,category,type').eq('company_id', cid).limit(500),
      sb.from('companies').select('commission_rate,commission_mode,vat_rate').eq('id', cid).maybeSingle(),
    ]).then(([{ data: props }, { data: tenants }, { data: pay }, { data: exp }, { data: comp }]) => {
      const P = props || [];
      const T = tenants || [];
      const PAY = pay || [];
      const EXP = exp || [];
      const commissionConfig = comp || {};

      const periodPay = (PAY as any[]).filter((p: any) => {
        const date = new Date(p.period_year, p.period_month - 1, 1);
        return date >= startDate && date <= now;
      });
      const periodExp = (EXP as any[]).filter((e: any) => {
        const date = new Date(e.date);
        return date >= startDate && date <= now;
      });

      const paid = periodPay.filter((p: any) => p.status === 'paid' || p.status === 'partial');
      const overdue = periodPay.filter((p: any) => p.status === 'late' || p.status === 'overdue');
      const prevPaid = (PAY as any[]).filter((p: any) => moKey(new Date(p.period_year, p.period_month - 1, 1)) === prevMo && (p.status === 'paid' || p.status === 'partial'));

      const revenue = paid.reduce((s: number, p: any) => s + Number(p.paid_amount || p.amount), 0);
      const prevRevenue = prevPaid.reduce((s: number, p: any) => s + Number(p.paid_amount || p.amount), 0);
      const expenses = periodExp.reduce((s: number, e: any) => s + Number(e.amount), 0);

      const collectionRate = periodPay.length > 0 ? Math.round((paid.length / periodPay.length) * 100) : 0;
      const impayeRate = periodPay.length > 0 ? Math.round((overdue.length / periodPay.length) * 100) : 0;

      const chart = Array.from({ length: months }, (_, i) => {
        const dd = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
        const monthKey = moKey(dd);
        const rev = (PAY as any[])
          .filter((p: any) => (p.status === 'paid' || p.status === 'partial') && moKey(new Date(p.period_year, p.period_month - 1, 1)) === monthKey)
          .reduce((s: number, p: any) => s + Number(p.paid_amount || p.amount), 0);
        const exp2 = (EXP as any[])
          .filter((e: any) => moKey(new Date(e.date)) === monthKey)
          .reduce((s: number, e: any) => s + Number(e.amount), 0);
        return {
          month: format(dd, 'MMM yy', { locale: fr }),
          revenue: rev,
          expenses: exp2,
          net: computeLandlordNet(rev, exp2, commissionConfig),
          commissions: calculateCommission(rev, commissionConfig).landlordCommission,
        };
      });

      const rented = (P as any[]).filter((p: any) => p.status === 'rented').length;
      const available = (P as any[]).filter((p: any) => p.status === 'available').length;
      const propStatus = [
        { name: 'Loues', value: rented, color: '#3b82f6' },
        { name: 'Disponibles', value: available, color: '#22c55e' },
        { name: 'Autres', value: Math.max(0, P.length - rented - available), color: '#94a3b8' },
      ].filter((x) => x.value > 0);

      const cats: Record<string, number> = {};
      periodExp.forEach((e: any) => { cats[e.category || 'Autre'] = (cats[e.category || 'Autre'] || 0) + Number(e.amount); });
      const expCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

      setD({
        props: P.length,
        rented,
        available,
        occupancy: P.length > 0 ? Math.round((rented / P.length) * 100) : 0,
        tenants: T.length,
        activeTenants: (T as any[]).filter((t: any) => t.status === 'active').length,
        revenue,
        prevRevenue,
        expenses,
        commissions: calculateCommission(revenue, commissionConfig).landlordCommission,
        net: computeLandlordNet(revenue, expenses, commissionConfig),
        collectionRate,
        impayeRate,
        chart,
        propStatus,
        expCats,
        commission: commissionConfig,
      });
      setLoading(false);
    });
  }, [company?.id, period]);

  const exportPDF = async () => {
    if (!d) return;
    setExporting(true);
    try {
      const mod = await import('@/lib/exportPDF');
      await mod.exportStatsPDF({ ...d, period }, company?.name || 'Nexora', (company as any)?.logo_url || null, (company as any)?.primary_color || null);
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36} /></div>;
  if (!d) return null;

  const growth = d.prevRevenue > 0 ? Math.round(((d.revenue - d.prevRevenue) / d.prevRevenue) * 100) : 0;
  const commissionLabel = getCommissionSummaryLabel(d.commission);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Statistiques" subtitle="Vue synthetique de votre activite" />
        <div className="flex items-center gap-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls + ' w-36'}>
            <option value="1">Ce mois</option>
            <option value="3">3 mois</option>
            <option value="6">6 mois</option>
            <option value="12">1 an</option>
          </select>
          <button onClick={exportPDF} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
            <Download size={15} />{exporting ? 'Export...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Biens loues', value: `${d.rented}/${d.props}`, sub: `${d.occupancy}% occupation`, color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100', icon: <Home size={15} /> },
            { label: 'Locataires actifs', value: String(d.activeTenants), sub: `/${d.tenants} total`, color: 'text-green-700', bg: 'bg-green-50 dark:bg-green-900/20 border-green-100', icon: <Users size={15} /> },
            { label: 'Revenus periode', value: formatCurrency(d.revenue), sub: growth >= 0 ? `+${growth}% vs mois prec.` : `${growth}% vs mois prec.`, color: growth >= 0 ? 'text-green-700' : 'text-red-700', bg: 'bg-green-50 dark:bg-green-900/20 border-green-100', icon: <CreditCard size={15} /> },
            { label: 'Benefice net', value: formatCurrency(d.net), sub: 'Apres commission et depenses', color: d.net >= 0 ? 'text-primary' : 'text-red-700', bg: d.net >= 0 ? 'bg-primary/10 dark:bg-primary/10 border-primary/20' : 'bg-red-50 dark:bg-red-900/20 border-red-100', icon: <TrendingUp size={15} /> },
            { label: commissionLabel, value: formatCurrency(d.commissions), sub: 'Generees automatiquement', color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100', icon: <Percent size={15} /> },
            { label: 'Total depenses', value: formatCurrency(d.expenses), sub: 'Bailleur + entreprise', color: 'text-red-700', bg: 'bg-red-50 dark:bg-red-900/20 border-red-100', icon: <TrendingDown size={15} /> },
            { label: 'Taux recouvrement', value: `${d.collectionRate}%`, sub: 'Paiements collectes', color: d.collectionRate >= 80 ? 'text-green-700' : 'text-amber-700', bg: d.collectionRate >= 80 ? 'bg-green-50 dark:bg-green-900/20 border-green-100' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100', icon: <TrendingUp size={15} /> },
            { label: "Taux d'impayes", value: `${d.impayeRate}%`, sub: 'Paiements en retard', color: d.impayeRate === 0 ? 'text-green-700' : 'text-red-700', bg: d.impayeRate === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100' : 'bg-red-50 dark:bg-red-900/20 border-red-100', icon: <TrendingDown size={15} /> },
          ].map((k, i) => (
            <div key={i} className={`border rounded-2xl p-4 ${k.bg}`}>
              <div className={`flex items-center gap-2 mb-1 ${k.color}`}>{k.icon}<p className="text-xs font-semibold uppercase tracking-wide">{k.label}</p></div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className={`text-xs mt-0.5 ${k.color} opacity-80`}>{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Evolution sur {period} mois</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.chart} barSize={10}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} name="Revenus" />
              <Bar dataKey="commissions" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Commissions" />
              <Bar dataKey="expenses" fill="#f97316" radius={[3, 3, 0, 0]} name="Depenses" />
              <Bar dataKey="net" fill="#a855f7" radius={[3, 3, 0, 0]} name="Net" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Courbe de tendance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.chart}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} name="Revenus" />
              <Line type="monotone" dataKey="net" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} name="Benefice net" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Statut des biens</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={d.propStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {d.propStatus.map((_: any, i: number) => <Cell key={i} fill={d.propStatus[i].color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {d.propStatus.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-foreground">{p.name}</span>
                    <span className="font-bold text-foreground ml-1">{p.value}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground mt-2">Taux : {d.occupancy}%</div>
              </div>
            </div>
          </div>

          {d.expCats.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Depenses par categorie</h3>
              <div className="space-y-2">
                {d.expCats.slice(0, 6).map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-foreground truncate">{e.name}</span>
                        <span className="text-muted-foreground ml-2">{formatCurrency(e.value)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                        <div className="h-1.5 rounded-full" style={{ background: e.color, width: `${Math.round((e.value / (d.expenses || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
