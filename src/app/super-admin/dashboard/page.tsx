'use client';
import { useEffect, useState } from 'react';
import { Building2, Users, TrendingUp, CheckCircle, Clock, XCircle, Crown, ArrowUpRight, Activity, Globe, Zap } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner, cardCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';

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

const PLAN_COLORS: Record<string,string> = {
  free:       'bg-slate-100 text-slate-600',
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

const MODULE_LABELS: Record<string,string> = {
  real_estate: '🏠 Immobilier',
  logistics:   '🚚 Logistique',
  online_payments: '💳 Paiements',
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
      // Module stats
      const modCount: Record<string,number> = {};
      C.forEach(c => (c.modules||[]).forEach((m:string) => { modCount[m] = (modCount[m]||0) + 1; }));
      // Plan stats
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

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;
  if (!stats) return null;

  const activationRate = stats.totalCompanies > 0
    ? Math.round((stats.activeCompanies / stats.totalCompanies) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Crown size={20} className="text-red-600"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Vue globale de la plateforme Nexora</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
          <span className="text-xs font-medium text-green-700">Plateforme opérationnelle</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Entreprises', value: stats.totalCompanies, sub: stats.activeCompanies+' actives', icon:<Building2 size={18}/>, color:'blue', href:'/super-admin/companies' },
          { label:'En attente',  value: stats.pendingCompanies, sub: 'à valider', icon:<Clock size={18}/>, color:'amber', href:'/super-admin/companies?filter=pending' },
          { label:'Utilisateurs',value: stats.totalUsers, sub: stats.activeUsers+' actifs', icon:<Users size={18}/>, color:'green', href:'/super-admin/users' },
          { label:'Taux activation', value: activationRate+'%', sub: 'des entreprises', icon:<TrendingUp size={18}/>, color:'purple', href:'/super-admin/companies' },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}>
            <Link href={k.href} className={cardCls+' p-4 block hover:shadow-md transition-shadow'}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${k.color}-50 text-${k.color}-600`}>
                  {k.icon}
                </div>
                <ArrowUpRight size={14} className="text-muted-foreground"/>
              </div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Alertes demandes en attente */}
      {stats.pendingCompanies > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-amber-600 flex-shrink-0"/>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-400 text-sm">
                {stats.pendingCompanies} demande(s) en attente de validation
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">Des entreprises attendent votre approbation pour accéder à la plateforme</p>
            </div>
          </div>
          <Link href="/super-admin/companies"
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors flex-shrink-0">
            Valider →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        {/* Entreprises récentes */}
        <div className={cardCls+' p-5'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Dernières inscriptions</h3>
            <Link href="/super-admin/companies" className="text-xs text-primary hover:underline">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {stats.recentCompanies.map(c => (
              <Link key={c.id} href={`/super-admin/companies/${c.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline ${PLAN_COLORS[c.plan]||'bg-slate-100 text-slate-600'}`}>
                    {c.plan}
                  </span>
                  {c.is_active
                    ? <CheckCircle size={14} className="text-green-500"/>
                    : <XCircle size={14} className="text-amber-500"/>
                  }
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Répartition modules + plans */}
        <div className="space-y-4">
          {/* Modules */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-primary"/>
              <h3 className="font-semibold text-foreground">Modules utilisés</h3>
            </div>
            {stats.moduleStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun module actif</p>
            ) : stats.moduleStats.map(m => (
              <div key={m.name} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{MODULE_LABELS[m.name] || m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.count} entreprise(s)</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (m.count / Math.max(stats.totalCompanies, 1)) * 100)}%` }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Plans */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-500"/>
              <h3 className="font-semibold text-foreground">Répartition des plans</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {stats.planStats.map(p => (
                <div key={p.plan} className={`p-3 rounded-xl text-center ${PLAN_COLORS[p.plan]||'bg-slate-100 text-slate-600'}`}>
                  <p className="text-xl font-bold">{p.count}</p>
                  <p className="text-xs font-medium capitalize">{p.plan}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className={cardCls+' p-5'}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-primary"/>
          <h3 className="font-semibold text-foreground">Actions rapides</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href:'/super-admin/companies', label:'Gérer les entreprises', icon:<Building2 size={18}/>, color:'text-blue-600 bg-blue-50 border-blue-100' },
            { href:'/super-admin/users',     label:'Gérer les utilisateurs', icon:<Users size={18}/>,    color:'text-green-600 bg-green-50 border-green-100' },
            { href:'/super-admin/roles',     label:'Rôles & permissions',    icon:<Crown size={18}/>,    color:'text-purple-600 bg-purple-50 border-purple-100' },
            { href:'/super-admin/companies/new', label:'Nouvelle entreprise', icon:<Zap size={18}/>,     color:'text-amber-600 bg-amber-50 border-amber-100' },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all hover:shadow-sm ${a.color}`}>
              <div className="flex-shrink-0">{a.icon}</div>
              <span className="text-sm font-medium leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}