'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, cardCls, selectCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Building2, Percent, CheckCircle, Clock, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Summary = {
  totalLoyers: number; totalCommissions: number; totalDepensesBailleur: number;
  totalDepensesEntreprise: number; totalRestitue: number; tauxRecouvrement: number;
};
type ChartData = { month: string; loyers: number; commissions: number; depenses: number; restitue: number };
type Transaction = {
  id: string; type: 'paiement'|'depense_bailleur'|'depense_entreprise'|'reversement';
  label: string; amount: number; date: string; status?: string;
};

export default function AccountingPage() {
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ totalLoyers:0, totalCommissions:0, totalDepensesBailleur:0, totalDepensesEntreprise:0, totalRestitue:0, tauxRecouvrement:0 });
  const [chart, setChart] = useState<ChartData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [commissionRate, setCommissionRate] = useState(10);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    const cid = company.id;

    // Get commission rate
    sb.from('companies').select('commission_rate').eq('id', cid).maybeSingle()
      .then(({ data }) => { if (data?.commission_rate) setCommissionRate(data.commission_rate); });

    Promise.all([
      sb.from('rent_payments').select('id,amount,status,period_month,period_year,paid_date,tenant_id,lease_id').eq('company_id', cid).order('paid_date', { ascending: false }).limit(500),
      sb.from('expenses').select('id,type,amount,description,date,category').eq('company_id', cid).order('date', { ascending: false }).limit(500),
      sb.from('disbursements').select('id,net_amount,status,paid_date,leases(properties(name))').eq('company_id', cid).order('created_at', { ascending: false }).limit(100),
    ]).then(([{ data: pays }, { data: exps }, { data: disbs }]) => {
      const P = (pays || []) as any[];
      const E = (exps || []) as any[];
      const D = (disbs || []) as any[];
      const rate = commissionRate / 100;

      const paid = P.filter(p => p.status === 'paid');
      // Paiements partiels: utiliser paid_amount si disponible
      const totalLoyers = paid.reduce((s: number, p: any) => s + (p.paid_amount || p.amount), 0);
      // Commission avec TVA 18%
      const vatRate = 0.18;
      const commHT = totalLoyers * rate;
      const commTVA = commHT * vatRate;
      const totalCommissions = commHT + commTVA; // Commission TTC
      const totalDepensesBailleur = E.filter((e: any) => e.type === 'bailleur').reduce((s: number, e: any) => s + e.amount, 0);
      const totalDepensesEntreprise = E.filter((e: any) => e.type === 'entreprise').reduce((s: number, e: any) => s + e.amount, 0);
      const totalRestitue = totalLoyers - totalCommissions - totalDepensesBailleur; // Net bailleur après commission TTC
      const tauxRecouvrement = P.length > 0 ? Math.round((paid.length / P.length) * 100) : 0;

      setSummary({ totalLoyers, totalCommissions, totalDepensesBailleur, totalDepensesEntreprise, totalRestitue, tauxRecouvrement });

      // Chart 12 months
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const mo = String(d.getMonth() + 1) + '/' + String(d.getFullYear());
        const loyers = paid.filter((p: any) => String(p.period_month) + '/' + String(p.period_year) === mo).reduce((s: number, p: any) => s + p.amount, 0);
        const commissions = loyers * rate;
        const depenses = E.filter((e: any) => { const ed = new Date(e.date); return String(ed.getMonth()+1)+'/'+String(ed.getFullYear())===mo; }).reduce((s: number, e: any) => s + e.amount, 0);
        return { month: format(d, 'MMM yy', { locale: fr }), loyers, commissions, depenses, restitue: loyers - commissions - depenses };
      });
      setChart(months);

      // Transactions list
      const txns: Transaction[] = [
        ...paid.map((p: any) => ({
          id: p.id, type: 'paiement' as const,
          label: `Loyer — ${p.period_month}/${p.period_year}`,
          amount: p.amount, date: p.paid_date || '', status: p.status,
        })),
        ...E.filter((e: any) => e.type === 'bailleur').map((e: any) => ({
          id: e.id, type: 'depense_bailleur' as const,
          label: `Dépense bailleur — ${e.description || e.category || '—'}`,
          amount: -e.amount, date: e.date,
        })),
        ...E.filter((e: any) => e.type === 'entreprise').map((e: any) => ({
          id: e.id, type: 'depense_entreprise' as const,
          label: `Dépense entreprise — ${e.description || e.category || '—'}`,
          amount: -e.amount, date: e.date,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
      setTransactions(txns);
      setLoading(false);
    });
  }, [company?.id, commissionRate]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;

  const txType: Record<string, { label: string; color: string }> = {
    paiement:          { label: 'Loyer perçu',       color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    depense_bailleur:  { label: 'Dépense bailleur',  color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    depense_entreprise:{ label: 'Dépense entreprise',color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    reversement:       { label: 'Reversement',        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Comptabilité" subtitle="Vue détaillée — Calculs automatiques"/>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Loyers perçus', value: formatCurrency(summary.totalLoyers), icon: <DollarSign size={18}/>, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
          { label: `Commissions (${commissionRate}%)`, value: formatCurrency(summary.totalCommissions), icon: <Percent size={18}/>, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
          { label: 'Dépenses bailleur', value: formatCurrency(summary.totalDepensesBailleur), icon: <Building2 size={18}/>, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' },
          { label: 'Dépenses entreprise', value: formatCurrency(summary.totalDepensesEntreprise), icon: <TrendingDown size={18}/>, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
          { label: 'À reverser aux bailleurs', value: formatCurrency(Math.max(0, summary.totalRestitue)), icon: <TrendingUp size={18}/>, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' },
          { label: 'Taux de recouvrement', value: `${summary.tauxRecouvrement}%`, icon: <CheckCircle size={18}/>, color: summary.tauxRecouvrement >= 80 ? 'text-green-600' : 'text-amber-600', bg: summary.tauxRecouvrement >= 80 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' },
        ].map((k, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${k.bg}`}>
            <div className={`flex items-center gap-2 mb-2 ${k.color}`}>{k.icon}<p className="text-xs font-semibold uppercase tracking-wide">{k.label}</p></div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Formule de calcul */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-border rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Formule de calcul automatique</p>
        <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
          <span className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-3 py-1.5 rounded-lg">{formatCurrency(summary.totalLoyers)} (loyers)</span>
          <span className="text-muted-foreground">−</span>
          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1.5 rounded-lg">{formatCurrency(summary.totalCommissions)} (commission {commissionRate}%)</span>
          <span className="text-muted-foreground">−</span>
          <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 px-3 py-1.5 rounded-lg">{formatCurrency(summary.totalDepensesBailleur)} (dépenses bailleur)</span>
          <span className="text-muted-foreground">=</span>
          <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-3 py-1.5 rounded-lg font-bold">{formatCurrency(Math.max(0, summary.totalRestitue))} à reverser</span>
        </div>
      </div>

      {/* Chart */}
      <div className={cardCls + ' p-5'}>
        <h3 className="font-semibold text-foreground mb-4">Évolution sur 6 mois</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart} barSize={16}>
            <XAxis dataKey="month" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v => (v/1000).toFixed(0)+'k'} tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v: number) => formatCurrency(v)}/>
            <Legend iconSize={10} wrapperStyle={{ fontSize:12 }}/>
            <Bar dataKey="loyers" fill="#22c55e" radius={[3,3,0,0]} name="Loyers"/>
            <Bar dataKey="commissions" fill="#3b82f6" radius={[3,3,0,0]} name="Commissions"/>
            <Bar dataKey="depenses" fill="#f97316" radius={[3,3,0,0]} name="Dépenses"/>
            <Bar dataKey="restitue" fill="#a855f7" radius={[3,3,0,0]} name="À reverser"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions */}
      <div className={cardCls}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Historique des transactions</h3>
        </div>
        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Aucune transaction</p>
          ) : transactions.map(t => (
            <div key={t.id + t.type} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${txType[t.type]?.color}`}>
                {txType[t.type]?.label}
              </span>
              <span className={`text-sm font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {t.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(t.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}