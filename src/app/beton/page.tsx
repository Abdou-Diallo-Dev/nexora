'use client';
import { useEffect, useState } from 'react';
import { Factory, Gauge, Package, Truck, Users, TrendingUp, AlertTriangle, CheckCircle2, Clock, BarChart3, ShoppingCart, FlaskConical } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner, cardCls } from '@/components/ui';
import Link from 'next/link';

const SARPA_YELLOW = 'hsl(var(--secondary))';
const SARPA_PURPLE = 'hsl(var(--primary))';

type KPI = { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; href?: string };

function KpiCard({ kpi }: { kpi: KPI }) {
  const inner = (
    <div className={cardCls + ' p-5 hover:shadow-md transition-all'}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: kpi.color + '20' }}>
          <span style={{ color: kpi.color }}>{kpi.icon}</span>
        </div>
      </div>
      <p className="text-2xl font-black text-foreground">{kpi.value}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{kpi.label}</p>
      {kpi.sub && <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>}
    </div>
  );
  return kpi.href ? <Link href={kpi.href}>{inner}</Link> : inner;
}

function QuickAction({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border hover:border-transparent transition-all hover:shadow-md text-center"
      style={{ ['--hover-bg' as any]: color + '10' }}
      onMouseEnter={e => (e.currentTarget.style.background = color + '10')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </Link>
  );
}

export default function BetonDashboard() {
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const kpis: KPI[] = [
    { label: 'Production du jour',    value: '—',  sub: 'M3 produits',         icon: <Gauge size={20}/>,         color: SARPA_PURPLE, href: '/beton/production' },
    { label: 'Stock matieres',        value: '—',  sub: 'Tonnes disponibles',   icon: <Package size={20}/>,       color: '#0ea5e9',    href: '/beton/stock/matieres' },
    { label: 'Commandes en cours',    value: '—',  sub: 'A livrer',             icon: <ShoppingCart size={20}/>,  color: SARPA_YELLOW, href: '/beton/commandes' },
    { label: 'Livraisons du jour',    value: '—',  sub: 'Prevues',              icon: <Truck size={20}/>,         color: '#10b981',    href: '/beton/livraisons' },
    { label: 'Qualite conformite',    value: '—%', sub: 'Ce mois',              icon: <FlaskConical size={20}/>,  color: '#8b5cf6',    href: '/beton/qualite' },
    { label: 'Camions actifs',        value: '—',  sub: 'Flotte disponible',    icon: <Truck size={20}/>,         color: '#f59e0b',    href: '/beton/flotte' },
    { label: 'Employes',              value: '—',  sub: 'Effectif total',       icon: <Users size={20}/>,         color: '#06b6d4',    href: '/beton/employes' },
    { label: 'CA mois en cours',      value: '—',  sub: 'F CFA',               icon: <TrendingUp size={20}/>,    color: '#22c55e',    href: '/beton/finance' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size={32}/>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${SARPA_PURPLE}, #1d4ed8)` }}>
          <Factory size={22} className="text-white"/>
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">SARPA Beton</h1>
          <p className="text-sm text-muted-foreground">Production de beton — Vue d'ensemble</p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border"
          style={{ color: '#22c55e', borderColor: '#22c55e30', background: '#22c55e10' }}>
          <CheckCircle2 size={12}/> Systeme operationnel
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {kpis.map(k => <KpiCard key={k.label} kpi={k}/>)}
      </div>

      {/* Actions rapides */}
      <div className={cardCls + ' p-5'}>
        <h2 className="text-sm font-bold text-foreground mb-4">Actions rapides</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickAction href="/beton/production"      icon={<Gauge size={18}/>}        label="Production"         color={SARPA_PURPLE}/>
          <QuickAction href="/beton/commandes"       icon={<ShoppingCart size={18}/>} label="Commande"           color={SARPA_YELLOW}/>
          <QuickAction href="/beton/livraisons"      icon={<Truck size={18}/>}        label="Livraison"          color="#10b981"/>
          <QuickAction href="/beton/qualite"         icon={<FlaskConical size={18}/>} label="Qualite"            color="#8b5cf6"/>
          <QuickAction href="/beton/stock/matieres"  icon={<Package size={18}/>}      label="Stock"              color="#0ea5e9"/>
          <QuickAction href="/beton/rapports"        icon={<BarChart3 size={18}/>}    label="Rapports"           color="#f59e0b"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Production aujourd'hui */}
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">Production — Aujourd'hui</h2>
            <Link href="/beton/production" className="text-xs font-semibold" style={{ color: SARPA_PURPLE }}>Voir tout</Link>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Gauge size={36} className="mb-3 opacity-20 text-foreground"/>
            <p className="text-sm text-muted-foreground">Aucune production enregistree aujourd'hui</p>
            <Link href="/beton/production"
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ background: SARPA_PURPLE }}>
              Enregistrer production
            </Link>
          </div>
        </div>

        {/* Alertes */}
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">Alertes & Notifications</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#22c55e20', color: '#22c55e' }}>0 alerte</span>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 size={36} className="mb-3 opacity-20 text-foreground"/>
            <p className="text-sm text-muted-foreground">Aucune alerte active</p>
            <p className="text-xs text-muted-foreground mt-1">Stock, maintenance et qualite sous controle</p>
          </div>
        </div>
      </div>

      {/* Livraisons du jour */}
      <div className={cardCls + ' p-5'}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Livraisons — Aujourd'hui</h2>
          <Link href="/beton/livraisons" className="text-xs font-semibold" style={{ color: SARPA_PURPLE }}>Voir tout</Link>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock size={36} className="mb-3 opacity-20 text-foreground"/>
          <p className="text-sm text-muted-foreground">Aucune livraison planifiee aujourd'hui</p>
          <Link href="/beton/livraisons"
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ background: '#10b981' }}>
            Planifier une livraison
          </Link>
        </div>
      </div>
    </div>
  );
}
