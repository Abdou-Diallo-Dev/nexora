'use client';
import { useEffect, useState } from 'react';
import { Building2, Users, TrendingUp, CheckCircle, Clock, XCircle, Crown, ArrowUpRight, Activity, Globe, Zap, Shield } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner, cardCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';

const SARPA_PURPLE = '#3d2674';
const SARPA_YELLOW = '#faab2d';

type Stats = {
  totalCompanies: number;
  activeCompanies: number;
  pendingCompanies: number;
  totalUsers: number;
  activeUsers: number;
  recentCompanies: { id:string; name:string; plan:string; is_active:boolean; created_at:string; modules:string[] }[];
  moduleStats: { name:string; count:number }[];
  planStats: { plan:string; count:number }[];
};

const PLAN_CFG: Record<string,{label:string;bg:string;color:string}> = {
  free:       { label:'Free',       bg:'rgba(61,38,116,0.08)',  color: SARPA_PURPLE },
  starter:    { label:'Starter',    bg:'rgba(61,38,116,0.14)',  color: SARPA_PURPLE },
  pro:        { label:'Pro',        bg:'rgba(61,38,116,0.22)',  color: SARPA_PURPLE },
  enterprise: { label:'Enterprise', bg:'rgba(250,171,45,0.22)', color:'#7c5200' },
};

const MODULE_LABELS: Record<string,string> = {
  real_estate:     'Immobilier',
  logistics:       'Logistiques',
  beton:           'Béton',
  online_payments: 'Paiements',
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from('companies').select('id,name,plan,is_active,created_at,modules').order('created_at', { ascending: false }),
      sb.from('users').select('id,is_active,role').neq('role', 'super_admin'),
    ]).then(([{ data: companies }, { data: users }]) => {
      const C = companies || [];
      const U = users || [];
      const modCount: Record<string,number> = {};
      C.forEach(c => (c.modules||[]).forEach((m:string) => { modCount[m] = (modCount[m]||0) + 1; }));
      const planCount: Record<string,number> = {};
      C.forEach(c => { planCount[c.plan] = (planCount[c.plan]||0) + 1; });
      setStats({
        totalCompanies:   C.length,
        activeCompanies:  C.filter(c => c.is_active).length,
        pendingCompanies: C.filter(c => !c.is_active).length,
        totalUsers:       U.length,
        activeUsers:      U.filter(u => u.is_active).length,
        recentCompanies:  C.slice(0, 8),
        moduleStats:      Object.entries(modCount).map(([name, count]) => ({ name, count })),
        planStats:        Object.entries(planCount).map(([plan, count]) => ({ plan, count })),
      });
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <LoadingSpinner size={32}/>
      <p className="text-sm text-muted-foreground">Chargement du tableau de bord...</p>
    </div>
  );
  if (!stats) return null;

  const activationRate = stats.totalCompanies > 0
    ? Math.round((stats.activeCompanies / stats.totalCompanies) * 100)
    : 0;

  const kpis = [
    {
      label: 'Filiales',
      value: stats.totalCompanies,
      sub: `${stats.activeCompanies} actives`,
      icon: <Building2 size={20}/>,
      iconBg: `rgba(61,38,116,0.12)`,
      iconColor: SARPA_PURPLE,
      href: '/super-admin/companies',
    },
    {
      label: 'En attente',
      value: stats.pendingCompanies,
      sub: 'à valider',
      icon: <Clock size={20}/>,
      iconBg: stats.pendingCompanies > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(61,38,116,0.08)',
      iconColor: stats.pendingCompanies > 0 ? '#ef4444' : SARPA_PURPLE,
      href: '/super-admin/companies?filter=pending',
    },
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      sub: `${stats.activeUsers} actifs`,
      icon: <Users size={20}/>,
      iconBg: `rgba(250,171,45,0.15)`,
      iconColor: '#7c5200',
      href: '/super-admin/users',
    },
    {
      label: 'Taux activation',
      value: `${activationRate}%`,
      sub: 'des filiales',
      icon: <TrendingUp size={20}/>,
      iconBg: `rgba(61,38,116,0.12)`,
      iconColor: SARPA_PURPLE,
      href: '/super-admin/companies',
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: `rgba(250,171,45,0.18)`, border: `1px solid rgba(250,171,45,0.30)` }}>
            <Crown size={22} style={{ color: SARPA_YELLOW }}/>
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Administration SARPA GROUP</h1>
            <p className="text-sm text-muted-foreground">Vue globale de la plateforme</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
          style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }}/>
          <span className="text-xs font-semibold" style={{ color: '#15803d' }}>Plateforme opérationnelle</span>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}>
            <Link href={k.href} className={cardCls+' p-4 block hover:shadow-md transition-all group'}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: k.iconBg }}>
                  <span style={{ color: k.iconColor }}>{k.icon}</span>
                </div>
                <ArrowUpRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
              </div>
              <p className="text-2xl font-black text-foreground">{k.value}</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{k.label}</p>
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Alerte en attente ── */}
      {stats.pendingCompanies > 0 && (
        <div className="rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ background: 'rgba(250,171,45,0.10)', border: '1px solid rgba(250,171,45,0.35)' }}>
          <div className="flex items-center gap-3">
            <Clock size={18} style={{ color: SARPA_YELLOW }} className="flex-shrink-0"/>
            <div>
              <p className="font-bold text-sm" style={{ color: '#7c5200' }}>
                {stats.pendingCompanies} filiale(s) en attente de validation
              </p>
              <p className="text-xs" style={{ color: '#92400e' }}>
                Des entreprises attendent votre approbation pour accéder à la plateforme
              </p>
            </div>
          </div>
          <Link href="/super-admin/companies"
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ background: SARPA_YELLOW, color: '#1a0f3d' }}>
            Valider →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Filiales récentes ── */}
        <div className={cardCls+' p-5'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">Dernières inscriptions</h3>
            <Link href="/super-admin/companies"
              className="text-xs font-semibold hover:underline" style={{ color: SARPA_PURPLE }}>
              Voir tout →
            </Link>
          </div>
          <div className="space-y-1">
            {stats.recentCompanies.map(c => {
              const plan = PLAN_CFG[c.plan] || PLAN_CFG.starter;
              return (
                <Link key={c.id} href={`/super-admin/companies/${c.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0"
                    style={{ background: `rgba(61,38,116,0.12)`, color: SARPA_PURPLE }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:inline"
                      style={{ background: plan.bg, color: plan.color }}>
                      {plan.label}
                    </span>
                    {c.is_active
                      ? <CheckCircle size={14} style={{ color: '#22c55e' }}/>
                      : <XCircle size={14} style={{ color: SARPA_YELLOW }}/>
                    }
                  </div>
                </Link>
              );
            })}
            {stats.recentCompanies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune filiale enregistrée</p>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="space-y-4">

          {/* Modules */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} style={{ color: SARPA_PURPLE }}/>
              <h3 className="font-bold text-foreground">Modules actifs</h3>
            </div>
            {stats.moduleStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun module actif</p>
            ) : stats.moduleStats.map(m => (
              <div key={m.name} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">{MODULE_LABELS[m.name] || m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.count} filiale(s)</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (m.count / Math.max(stats.totalCompanies, 1)) * 100)}%`,
                      background: `linear-gradient(90deg, ${SARPA_PURPLE}, rgba(61,38,116,0.6))`,
                    }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Plans */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} style={{ color: SARPA_YELLOW }}/>
              <h3 className="font-bold text-foreground">Plans des filiales</h3>
            </div>
            {stats.planStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun plan enregistré</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {stats.planStats.map(p => {
                  const cfg = PLAN_CFG[p.plan] || PLAN_CFG.starter;
                  return (
                    <div key={p.plan} className="p-3 rounded-xl text-center"
                      style={{ background: cfg.bg }}>
                      <p className="text-xl font-black" style={{ color: cfg.color }}>{p.count}</p>
                      <p className="text-xs font-semibold capitalize mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <div className={cardCls+' p-5'}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} style={{ color: SARPA_PURPLE }}/>
          <h3 className="font-bold text-foreground">Actions rapides</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href:'/super-admin/companies',     label:'Gérer les filiales',    icon:<Building2 size={18}/>, primary: true },
            { href:'/super-admin/users',          label:'Gérer les utilisateurs', icon:<Users size={18}/>,    primary: false },
            { href:'/super-admin/roles',          label:'Rôles & permissions',   icon:<Shield size={18}/>,   primary: true },
            { href:'/super-admin/companies/new',  label:'Nouvelle filiale',       icon:<Zap size={18}/>,      primary: false, accent: true },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all hover:shadow-sm"
              style={
                a.accent
                  ? { background: `rgba(250,171,45,0.12)`, borderColor: `rgba(250,171,45,0.35)`, color: '#7c5200' }
                  : a.primary
                    ? { background: `rgba(61,38,116,0.07)`, borderColor: `rgba(61,38,116,0.18)`, color: SARPA_PURPLE }
                    : { background: `rgba(61,38,116,0.04)`, borderColor: `rgba(61,38,116,0.12)`, color: SARPA_PURPLE }
              }>
              <div className="flex-shrink-0">{a.icon}</div>
              <span className="text-sm font-semibold leading-tight">{a.label}</span>
              <ArrowUpRight size={13} className="ml-auto opacity-60"/>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
