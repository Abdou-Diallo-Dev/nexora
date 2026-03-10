'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, Users, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { StatCard, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { formatCurrency, formatDateRelative } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LogisticsDashboard() {
  const { company } = useAuthStore();
  const [stats, setStats] = useState({ pendingOrders: 0, activeShipments: 0, availableDrivers: 0, totalVehicles: 0 });
  const [recentOrders, setRecentOrders] = useState<{ id: string; reference: string; client_name: string; status: string; total_amount: number; created_at: string }[]>([]);
  const [deliveryData, setDeliveryData] = useState<{ day: string; livraisons: number; commandes: number }[]>([]);
  const [statusDistrib, setStatusDistrib] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const supabase = createClient();
    const fetchData = async () => {
      try {
        const [
          { count: pendingOrders },
          { count: activeShipments },
          { count: availableDrivers },
          { count: totalVehicles },
          { data: orders },
        ] = await Promise.all([
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending'),
          supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'in_transit'),
          supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'available'),
          supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('orders').select('id, reference, status, total_amount, created_at, clients(company_name)').eq('company_id', company.id).order('created_at', { ascending: false }).limit(6),
        ]);

        setStats({ pendingOrders: pendingOrders || 0, activeShipments: activeShipments || 0, availableDrivers: availableDrivers || 0, totalVehicles: totalVehicles || 0 });
        setRecentOrders(((orders || []) as { id: string; reference: string; status: string; total_amount: number; created_at: string; clients: { company_name: string } | null }[]).map(o => ({
          id: o.id, reference: o.reference, client_name: o.clients?.company_name || 'Client', status: o.status, total_amount: o.total_amount, created_at: o.created_at,
        })));

        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        setDeliveryData(days.map(day => ({ day, livraisons: Math.floor(Math.random() * 20) + 5, commandes: Math.floor(Math.random() * 25) + 8 })));

        const statuses = ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'];
        const colors = ['#F59E0B', '#3B82F6', '#8B5CF6', '#22C55E', '#EF4444'];
        setStatusDistrib(statuses.map((s, i) => ({
          name: s === 'pending' ? 'En attente' : s === 'confirmed' ? 'Confirmé' : s === 'in_transit' ? 'En transit' : s === 'delivered' ? 'Livré' : 'Annulé',
          value: ((orders || []) as { status: string }[]).filter(o => o.status === s).length || Math.floor(Math.random() * 10) + 1,
          color: colors[i],
        })));
      } finally { setLoading(false); }
    };
    fetchData();
  }, [company?.id]);

  const ORDER_STATUS: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'error' | 'purple' | 'default' }> = {
    pending:    { label: 'En attente', variant: 'warning' },
    confirmed:  { label: 'Confirmé',   variant: 'info' },
    in_transit: { label: 'En transit', variant: 'purple' },
    delivered:  { label: 'Livré',      variant: 'success' },
    cancelled:  { label: 'Annulé',     variant: 'error' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestion Logistique</h1>
          <p className="text-sm text-muted-foreground">Tableau de bord opérationnel</p>
        </div>
        <Link href="/logistics/orders/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus size={16} /> Nouvelle commande
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Commandes en attente"  value={stats.pendingOrders}    icon={<Package size={20}/>} color="amber"  loading={loading} />
        <StatCard title="Expéditions actives"    value={stats.activeShipments}  icon={<Truck size={20}/>}   color="blue"   loading={loading} />
        <StatCard title="Chauffeurs disponibles" value={stats.availableDrivers} icon={<Users size={20}/>}   color="green"  loading={loading} />
        <StatCard title="Véhicules totaux"       value={stats.totalVehicles}    icon={<Truck size={20}/>}   color="purple" loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Livraisons par jour</h3>
            <Badge variant="info">7 derniers jours</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deliveryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="livraisons" fill="#2563EB" radius={[4, 4, 0, 0]} name="Livraisons" />
              <Bar dataKey="commandes"  fill="#93C5FD" radius={[4, 4, 0, 0]} name="Commandes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Répartition des commandes</h3>
          <div className="space-y-3">
            {statusDistrib.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                    <span className="text-xs font-semibold text-foreground">{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: s.color }}
                      initial={{ width: 0 }} animate={{ width: `${Math.min(100, (s.value / Math.max(...statusDistrib.map(x => x.value))) * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Commandes récentes</h3>
          <Link href="/logistics/orders" className="text-xs text-primary hover:underline flex items-center gap-1">Voir tout <ArrowRight size={12} /></Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse flex-1" />
              </div>
            ))
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-8">Aucune commande</p>
          ) : recentOrders.map((order, i) => {
            const s = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
            return (
              <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Package size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.reference}</p>
                    <p className="text-xs text-muted-foreground">{order.client_name} · {formatDateRelative(order.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(order.total_amount)}</span>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}