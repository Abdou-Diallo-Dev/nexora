'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Truck, MapPin, DollarSign, AlertTriangle, Download, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, btnSecondary, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

type ChartData = {
  date: string;
  deliveries: number;
  revenue: number;
  cost: number;
};

type StatusBreakdown = {
  name: string;
  value: number;
  percentage: number;
};

type VehicleStats = {
  type: string;
  available: number;
  in_mission: number;
  maintenance: number;
  usage_percent: number;
};

export default function LogisticsStatsPage() {
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // KPIs
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [avgProfit, setAvgProfit] = useState(0);
  const [activeVehicles, setActiveVehicles] = useState(0);
  const [avgDistance, setAvgDistance] = useState(0);
  
  // Charts
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [vehicleStats, setVehicleStats] = useState<VehicleStats[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#22c55e', '#ef4444', '#94a3b8', '#8b5cf6'];

  const getPeriodDates = () => {
    const now = new Date();
    let start: Date;
    
    switch(period) {
      case 'week':
        start = subDays(now, 7);
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    return { start, end: now };
  };

  useEffect(() => {
    if (!company?.id) return;
    
    const load = async () => {
      setLoading(true);
      const sb = createClient();
      const cid = company.id;
      const { start, end } = getPeriodDates();
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      try {
        // Fetch deliveries
        const { data: deliveries } = await sb
          .from('deliveries')
          .select('id,status,final_price,distance_km,created_at,logistics_clients(name)')
          .eq('company_id', cid)
          .gte('created_at', startStr)
          .lte('created_at', endStr)
          .order('created_at', { ascending: true });

        // Fetch maintenance costs
        const { data: maintenance } = await sb
          .from('maintenance_records')
          .select('cost,performed_at')
          .eq('company_id', cid)
          .gte('performed_at', startStr)
          .lte('performed_at', endStr);

        // Fetch vehicles
        const { data: vehicles } = await sb
          .from('vehicles')
          .select('id,type,status')
          .eq('company_id', cid);

        // Process KPIs
        const dels = deliveries || [];
        const maint = maintenance || [];
        const vehic = vehicles || [];

        const totalDel = dels.length;
        const totalRev = dels.reduce((sum: number, d: any) => sum + (Number(d.final_price) || 0), 0);
        const totalMaintCost = maint.reduce((sum: number, m: any) => sum + (Number(m.cost) || 0), 0);
        const totalCostVal = totalMaintCost; // + fuel (si données disponibles)
        
        setTotalDeliveries(totalDel);
        setTotalRevenue(totalRev);
        setTotalCost(totalCostVal);
        setAvgProfit(totalDel > 0 ? (totalRev - totalCostVal) / totalDel : 0);
        setActiveVehicles(vehic.filter((v: any) => v.status === 'available' || v.status === 'on_mission').length);
        setAvgDistance(totalDel > 0 ? dels.reduce((sum: any, d: any) => sum + (Number(d.distance_km) || 0), 0) / totalDel : 0);

        // Status breakdown
        const statuses: Record<string, number> = {};
        dels.forEach((d: any) => {
          statuses[d.status] = (statuses[d.status] || 0) + 1;
        });
        
        const statusData: StatusBreakdown[] = Object.entries(statuses).map(([name, value]) => ({
          name: name.replace(/_/g, ' ').toUpperCase(),
          value,
          percentage: Math.round((value / totalDel) * 100),
        }));
        setStatusBreakdown(statusData);

        // Vehicle stats
        const vehicleData: Record<string, any> = {};
        vehic.forEach((v: any) => {
          if (!vehicleData[v.type]) {
            vehicleData[v.type] = { available: 0, in_mission: 0, maintenance: 0, total: 0 };
          }
          vehicleData[v.type].total++;
          if (v.status === 'available') vehicleData[v.type].available++;
          else if (v.status === 'on_mission') vehicleData[v.type].in_mission++;
          else if (v.status === 'maintenance') vehicleData[v.type].maintenance++;
        });

        const vStats: VehicleStats[] = Object.entries(vehicleData).map(([type, data]) => ({
          type,
          available: data.available,
          in_mission: data.in_mission,
          maintenance: data.maintenance,
          usage_percent: Math.round(((data.in_mission) / data.total) * 100),
        }));
        setVehicleStats(vStats);

        // Top clients
        const clientRevenue: Record<string, number> = {};
        dels.forEach((d: any) => {
          const client = d.logistics_clients?.name || 'Anonyme';
          clientRevenue[client] = (clientRevenue[client] || 0) + (Number(d.final_price) || 0);
        });

        const topClientsData = Object.entries(clientRevenue)
          .map(([name, revenue]) => ({ name, revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        setTopClients(topClientsData);

        // Build chart data (daily)
        const dateMap: Record<string, ChartData> = {};
        dels.forEach((d: any) => {
          const date = format(new Date(d.created_at), 'MMM dd', { locale: fr });
          if (!dateMap[date]) {
            dateMap[date] = { date, deliveries: 0, revenue: 0, cost: 0 };
          }
          dateMap[date].deliveries++;
          dateMap[date].revenue += Number(d.final_price) || 0;
        });

        const chartD = Object.values(dateMap).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setChartData(chartD);

      } catch (err) {
        console.error('Erreur chargement stats:', err);
      }
      
      setLoading(false);
    };

    load();
  }, [company?.id, period]);

  if (loading) return <LoadingSpinner />;

  const profit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Statistiques Logistique" />
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              period === p
                ? 'bg-primary text-white'
                : 'border border-border hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            style={period === p ? { background: 'hsl(var(--primary))' } : {}}
          >
            {p === 'week' ? 'Cette semaine' : p === 'month' ? 'Ce mois' : 'Cette année'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={cardCls + ' p-6'}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Livraisons</span>
            <Truck size={18} style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <p className="text-3xl font-bold text-foreground">{totalDeliveries}</p>
          <p className="text-xs text-muted-foreground mt-1">Total période</p>
        </div>

        <div className={cardCls + ' p-6'}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Revenus</span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Chiffre d'affaires</p>
        </div>

        <div className={cardCls + ' p-6'}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Dépenses</span>
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">Maintenance, carburant...</p>
        </div>

        <div className={cardCls + ' p-6'}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Profit</span>
            <DollarSign size={18} style={{ color: 'hsl(var(--secondary))' }} />
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(profit)}</p>
          <p className="text-xs mt-1" style={{ color: profit >= 0 ? '#22c55e' : '#ef4444' }}>
            Marge: {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={cardCls + ' p-4'}>
          <p className="text-xs text-muted-foreground mb-2">Véhicules actifs</p>
          <p className="text-2xl font-bold text-foreground">{activeVehicles}</p>
        </div>
        <div className={cardCls + ' p-4'}>
          <p className="text-xs text-muted-foreground mb-2">Distance moyenne</p>
          <p className="text-2xl font-bold text-foreground">{avgDistance.toFixed(1)} km</p>
        </div>
        <div className={cardCls + ' p-4'}>
          <p className="text-xs text-muted-foreground mb-2">Profit par livraison</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(avgProfit)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue trend */}
        <div className={cardCls + ' p-6'}>
          <h3 className="font-bold text-foreground mb-4">Tendance revenus</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Livraisons par jour */}
        <div className={cardCls + ' p-6'}>
          <h3 className="font-bold text-foreground mb-4">Livraisons par jour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Bar dataKey="deliveries" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status / Client breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status breakdown */}
        <div className={cardCls + ' p-6'}>
          <h3 className="font-bold text-foreground mb-4">Répartition statuts livraisons</h3>
          {statusBreakdown.length > 0 ? (
            <div className="space-y-3">
              {statusBreakdown.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${item.percentage}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune donnée</p>
          )}
        </div>

        {/* Top clients */}
        <div className={cardCls + ' p-6'}>
          <h3 className="font-bold text-foreground mb-4">Top 5 clients</h3>
          {topClients.length > 0 ? (
            <div className="space-y-2">
              {topClients.map((client, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-medium text-sm text-foreground">{client.name}</span>
                  <span className="font-bold text-sm" style={{ color: 'hsl(var(--primary))' }}>
                    {formatCurrency(client.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* Vehicle stats */}
      {vehicleStats.length > 0 && (
        <div className={cardCls + ' p-6 mb-6'}>
          <h3 className="font-bold text-foreground mb-4">Utilisation véhicules par type</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 font-semibold text-foreground">Type</th>
                  <th className="text-center py-2 px-4 font-semibold text-foreground">Disponibles</th>
                  <th className="text-center py-2 px-4 font-semibold text-foreground">En mission</th>
                  <th className="text-center py-2 px-4 font-semibold text-foreground">Maintenance</th>
                  <th className="text-center py-2 px-4 font-semibold text-foreground">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStats.map((stat, i) => (
                  <tr key={i} className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 font-medium text-foreground capitalize">{stat.type}</td>
                    <td className="py-3 px-4 text-center text-foreground">{stat.available}</td>
                    <td className="py-3 px-4 text-center text-foreground">{stat.in_mission}</td>
                    <td className="py-3 px-4 text-center text-foreground">{stat.maintenance}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="w-full h-2 bg-border rounded-full overflow-hidden inline-flex" style={{ width: '80px' }}>
                        <div
                          className="h-full"
                          style={{ width: `${stat.usage_percent}%`, background: 'hsl(var(--secondary))' }}
                        />
                      </div>
                      <span className="ml-2 text-xs font-medium text-foreground">{stat.usage_percent}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
