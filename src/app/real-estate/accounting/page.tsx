'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateCommission, computeCompanyNet, computeLandlordNet, getCommissionSummaryLabel, normalizeCommissionSettings } from '@/lib/commission';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, cardCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Building2, Percent, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Summary = {
  totalLoyers: number;
  totalCommissions: number;
  commHT: number;
  commTVA: number;
  totalDepensesBailleur: number;
  totalDepensesEntreprise: number;
  totalRestitue: number;
  tauxRecouvrement: number;
  netEntreprise: number;
  netBailleur: number;
};

type ChartData = {
  month: string;
  loyers: number;
  commissionsHT: number;
  depBailleur: number;
  depEntreprise: number;
  netEntreprise: number;
  netBailleur: number;
};

type Transaction = {
  id: string;
  type: 'paiement' | 'depense_bailleur' | 'depense_entreprise' | 'reversement';
  label: string;
  amount: number;
  date: string;
  status?: string;
};

export default function AccountingPage() {
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({
    totalLoyers: 0,
    totalCommissions: 0,
    commHT: 0,
    commTVA: 0,
    totalDepensesBailleur: 0,
    totalDepensesEntreprise: 0,
    totalRestitue: 0,
    tauxRecouvrement: 0,
    netEntreprise: 0,
    netBailleur: 0,
  });
  const [chart, setChart] = useState<ChartData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [commission, setCommission] = useState<any>({ commission_rate: 10, commission_mode: 'ttc', vat_rate: 18 });

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    const cid = company.id;

    Promise.resolve(
      sb.from('companies').select('commission_rate,commission_mode,vat_rate').eq('id', cid).maybeSingle()
    )
      .then(({ data }) => setCommission(data || { commission_rate: 10, commission_mode: 'ttc', vat_rate: 18 }))
      .catch((err: any) => console.error('Error loading commission settings:', err));

    Promise.all([
      sb.from('rent_payments').select('id,amount,paid_amount,status,period_month,period_year,paid_date,tenant_id,lease_id').eq('company_id', cid).order('paid_date', { ascending: false }).limit(500),
      sb.from('expenses').select('id,type,amount,description,date,category').eq('company_id', cid).order('date', { ascending: false }).limit(500),
    ]).then(([{ data: pays }, { data: exps }]) => {
      try {
        const P = (pays || []) as any[];
        const E = (exps || []) as any[];

        const paid = P.filter((p) => p.status === 'paid' || p.status === 'partial');
        const totalLoyers = paid.reduce((s: number, p: any) => s + Number(p.paid_amount || p.amount), 0);
        const commissionTotals = calculateCommission(totalLoyers, commission);
        const totalDepensesBailleur = E.filter((e: any) => e.type === 'bailleur').reduce((s: number, e: any) => s + Number(e.amount), 0);
        const totalDepensesEntreprise = E.filter((e: any) => e.type === 'entreprise').reduce((s: number, e: any) => s + Number(e.amount), 0);
        const paidFull = P.filter((p: any) => p.status === 'paid').length;

        setSummary({
          totalLoyers,
          totalCommissions: commissionTotals.landlordCommission,
          commHT: commissionTotals.commissionHT,
          commTVA: commissionTotals.commissionTVA,
          totalDepensesBailleur,
          totalDepensesEntreprise,
          totalRestitue: computeLandlordNet(totalLoyers, totalDepensesBailleur, commission),
          tauxRecouvrement: P.length > 0 ? Math.round((paidFull / P.length) * 100) : 0,
          netEntreprise: computeCompanyNet(totalLoyers, totalDepensesEntreprise, commission),
          netBailleur: computeLandlordNet(totalLoyers, totalDepensesBailleur, commission),
        });

        const now = new Date();
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          const mo = String(d.getMonth() + 1) + '/' + String(d.getFullYear());
          const loyers = paid.filter((p: any) => String(p.period_month) + '/' + String(p.period_year) === mo).reduce((s: number, p: any) => s + Number(p.paid_amount || p.amount), 0);
          const monthCommission = calculateCommission(loyers, commission);
          const depBailleur = E.filter((e: any) => {
            const ed = new Date(e.date);
            return e.type === 'bailleur' && String(ed.getMonth() + 1) + '/' + String(ed.getFullYear()) === mo;
          }).reduce((s: number, e: any) => s + Number(e.amount), 0);
          const depEntreprise = E.filter((e: any) => {
            const ed = new Date(e.date);
            return e.type === 'entreprise' && String(ed.getMonth() + 1) + '/' + String(ed.getFullYear()) === mo;
          }).reduce((s: number, e: any) => s + Number(e.amount), 0);

          return {
            month: format(d, 'MMM yy', { locale: fr }),
            loyers,
            commissionsHT: monthCommission.companyRevenue,
            depBailleur,
            depEntreprise,
            netEntreprise: computeCompanyNet(loyers, depEntreprise, commission),
            netBailleur: computeLandlordNet(loyers, depBailleur, commission),
          };
        });
        setChart(months);

        const txns: Transaction[] = [
          ...paid.map((p: any) => ({
            id: p.id,
            type: 'paiement' as const,
            label: `Loyer - ${p.period_month}/${p.period_year}`,
            amount: Number(p.paid_amount || p.amount),
            date: p.paid_date || '',
            status: p.status,
          })),
          ...E.filter((e: any) => e.type === 'bailleur').map((e: any) => ({
            id: e.id,
            type: 'depense_bailleur' as const,
            label: `Depense bailleur - ${e.description || e.category || '-'}`,
            amount: -Number(e.amount),
            date: e.date,
          })),
          ...E.filter((e: any) => e.type === 'entreprise').map((e: any) => ({
            id: e.id,
            type: 'depense_entreprise' as const,
            label: `Depense entreprise - ${e.description || e.category || '-'}`,
            amount: -Number(e.amount),
            date: e.date,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);

        setTransactions(txns);
        setLoading(false);
      } catch (error) {
        console.error('Error processing accounting data:', error);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Error fetching accounting data:', err);
      setLoading(false);
    });
  }, [company?.id, commission]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36} /></div>;

  const commissionSettings = normalizeCommissionSettings(commission);
  const commissionLabel = getCommissionSummaryLabel(commission);

  const txType: Record<string, { label: string; color: string }> = {
    paiement: { label: 'Loyer percu', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    depense_bailleur: { label: 'Depense bailleur', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    depense_entreprise: { label: 'Depense entreprise', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    reversement: { label: 'Reversement', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Comptabilite" subtitle="Vue detaillee avec parametres de commission par entreprise" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Loyers percus', value: formatCurrency(summary.totalLoyers), icon: <DollarSign size={18} />, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
          { label: commissionLabel, value: formatCurrency(summary.commHT), icon: <Percent size={18} />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
          { label: `TVA commission (${commissionSettings.vatRate}%)`, value: formatCurrency(summary.commTVA), icon: <Percent size={18} />, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800' },
          { label: 'Depenses bailleur', value: formatCurrency(summary.totalDepensesBailleur), icon: <Building2 size={18} />, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' },
          { label: 'Depenses entreprise', value: formatCurrency(summary.totalDepensesEntreprise), icon: <TrendingDown size={18} />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
          { label: 'Net bailleur', value: formatCurrency(summary.netBailleur), icon: <TrendingUp size={18} />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' },
          { label: 'Net entreprise', value: formatCurrency(summary.netEntreprise), icon: <TrendingUp size={18} />, color: summary.netEntreprise >= 0 ? 'text-emerald-600' : 'text-red-600', bg: summary.netEntreprise >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
          { label: 'Taux de recouvrement', value: `${summary.tauxRecouvrement}%`, icon: <CheckCircle size={18} />, color: summary.tauxRecouvrement >= 80 ? 'text-green-600' : 'text-amber-600', bg: summary.tauxRecouvrement >= 80 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' },
        ].map((k, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${k.bg}`}>
            <div className={`flex items-center gap-2 mb-2 ${k.color}`}>{k.icon}<p className="text-xs font-semibold uppercase tracking-wide">{k.label}</p></div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Apercu bailleur</p>
          <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
            <span className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-3 py-1.5 rounded-lg">{formatCurrency(summary.totalLoyers)} (loyers)</span>
            <span className="text-muted-foreground">-</span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs">{commissionLabel} {formatCurrency(summary.totalCommissions)}</span>
            <span className="text-muted-foreground">-</span>
            <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 px-3 py-1.5 rounded-lg">{formatCurrency(summary.totalDepensesBailleur)} (depenses bailleur)</span>
            <span className="text-muted-foreground">=</span>
            <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-3 py-1.5 rounded-lg font-bold">{formatCurrency(summary.netBailleur)} net bailleur</span>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Apercu entreprise</p>
          <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1.5 rounded-lg">Commission HT {formatCurrency(summary.commHT)}</span>
            <span className="text-muted-foreground">-</span>
            <span className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 px-3 py-1.5 rounded-lg">{formatCurrency(summary.totalDepensesEntreprise)} (depenses entreprise)</span>
            <span className="text-muted-foreground">=</span>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1.5 rounded-lg font-bold">{formatCurrency(summary.netEntreprise)} net entreprise</span>
          </div>
        </div>
      </div>

      <div className={cardCls + ' p-5'}>
        <h3 className="font-semibold text-foreground mb-4">Evolution sur 6 mois</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart} barSize={16}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="loyers" fill="#22c55e" radius={[3, 3, 0, 0]} name="Revenus bailleur" />
            <Bar dataKey="commissionsHT" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Commission HT entreprise" />
            <Bar dataKey="depBailleur" fill="#f97316" radius={[3, 3, 0, 0]} name="Depenses bailleur" />
            <Bar dataKey="depEntreprise" fill="#ef4444" radius={[3, 3, 0, 0]} name="Depenses entreprise" />
            <Bar dataKey="netEntreprise" fill="#10b981" radius={[3, 3, 0, 0]} name="Net entreprise" />
            <Bar dataKey="netBailleur" fill="#a855f7" radius={[3, 3, 0, 0]} name="Net bailleur" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={cardCls}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Historique des transactions</h3>
        </div>
        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Aucune transaction</p>
          ) : transactions.map((t) => (
            <div key={t.id + t.type} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${txType[t.type]?.color}`}>{txType[t.type]?.label}</span>
              <span className={`text-sm font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(t.amount))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
