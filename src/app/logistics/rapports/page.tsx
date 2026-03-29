'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Truck, Users, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, cardCls, selectCls } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RapportsPage() {
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6');
  const [summary, setSummary] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();
    const months = Number(period);
    const now = new Date();

    // Build monthly data
    const monthPromises = Array.from({ length: months }, (_, i) => {
      const d = subMonths(now, months - 1 - i);
      const start = startOfMonth(d).toISOString();
      const end = endOfMonth(d).toISOString();
      const label = format(d, 'MMM yy', { locale: fr });
      return Promise.all([
        sb.from('deliveries').select('final_price,payment_status,status').eq('company_id', company.id).gte('created_at', start).lte('created_at', end),
        sb.from('vehicle_maintenance').select('cost').eq('company_id', company.id).gte('performed_at', start.split('T')[0]).lte('performed_at', end.split('T')[0]),
        sb.from('bank_transactions').select('type,amount').eq('company_id', company.id).gte('transaction_date', start.split('T')[0]).lte('transaction_date', end.split('T')[0]),
      ]).then(([{ data: D }, { data: M }, { data: T }]) => {
        const deliveries = D || [];
        const maintenances = M || [];
        const transactions = T || [];
        const revenue = deliveries.filter((d: any) => d.payment_status === 'paid').reduce((s: number, d: any) => s + Number(d.final_price || 0), 0);
        const maintCost = maintenances.reduce((s: number, m: any) => s + Number(m.cost || 0), 0);
        const bankCredit = transactions.filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + Number(t.amount), 0);
        const bankDebit = transactions.filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + Number(t.amount), 0);
        return {
          label, revenue, maintCost, bankCredit, bankDebit,
          deliveriesTotal: deliveries.length,
          deliveriesOk: deliveries.filter((d: any) => d.status === 'delivered').length,
        };
      });
    });

    Promise.all([
      Promise.all(monthPromises),
      sb.from('logistics_finance_summary').select('*').eq('company_id', company.id).maybeSingle(),
    ]).then(([monthly, { data: fin }]) => {
      setMonthlyData(monthly);
      setSummary(fin);
      setLoading(false);
    });
  }, [company?.id, period]);

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalMaint = monthlyData.reduce((s, m) => s + m.maintCost, 0);
  const totalDeliveries = monthlyData.reduce((s, m) => s + m.deliveriesTotal, 0);
  const totalOk = monthlyData.reduce((s, m) => s + m.deliveriesOk, 0);

  return (
    <div>
      <PageHeader title="Rapports financiers"
        subtitle="Analyse complète des performances"
        actions={
          <select value={period} onChange={e => setPeriod(e.target.value)} className={selectCls + ' w-36'}>
            <option value="3">3 mois</option>
            <option value="6">6 mois</option>
            <option value="12">12 mois</option>
          </select>
        }
      />

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Chiffre d\'affaires', value: formatCurrency(totalRevenue), icon: <DollarSign size={18} />, color: 'text-green-700 bg-green-50', trend: '+' },
                { label: 'Coûts maintenance', value: formatCurrency(totalMaint), icon: <Truck size={18} />, color: 'text-red-700 bg-red-50', trend: '-' },
                { label: 'Livraisons total', value: String(totalDeliveries), icon: <Package size={18} />, color: 'text-blue-700 bg-blue-50', trend: '' },
                { label: 'Taux de succès', value: totalDeliveries > 0 ? `${Math.round((totalOk / totalDeliveries) * 100)}%` : 'N/A', icon: <TrendingUp size={18} />, color: 'text-primary bg-primary/10', trend: '' },
              ].map((k, i) => (
                <div key={i} className={cardCls + ' p-4'}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>{k.icon}</div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{k.label}</p>
                  <p className="text-2xl font-black text-foreground mt-1">{k.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div className={cardCls + ' p-5'}>
              <h3 className="font-semibold text-foreground mb-4">Revenus vs Coûts maintenance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenus" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maintCost" name="Maintenance" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Deliveries chart */}
            <div className={cardCls + ' p-5'}>
              <h3 className="font-semibold text-foreground mb-4">Volume de livraisons</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="deliveriesTotal" name="Total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="deliveriesOk" name="Livrées" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Finance summary table */}
            {summary && (
              <div className={cardCls + ' p-5'}>
                <h3 className="font-semibold text-foreground mb-4">État financier global</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Solde bancaire total', value: formatCurrency(Number(summary.total_bank_balance || 0)), color: 'text-green-700' },
                    { label: 'Revenus livraisons', value: formatCurrency(Number(summary.total_delivery_revenue || 0)), color: 'text-blue-700' },
                    { label: 'Dettes clients restantes', value: formatCurrency(Number(summary.total_debt_remaining || 0)), color: 'text-red-700' },
                    { label: 'Factures en attente', value: formatCurrency(Number(summary.pending_invoice_amount || 0)), color: 'text-amber-700' },
                  ].map((k, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                      <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
