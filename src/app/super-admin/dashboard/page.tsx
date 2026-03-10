'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users, CheckCircle, TrendingUp, Activity, Crown, Star, Zap, Shield, UserX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, StatCard, LoadingSpinner, cardCls, btnPrimary, Badge, BadgeVariant } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type Company = { id: string; name: string; plan: string; is_active: boolean; created_at: string; email: string | null };
type RecentUser = { id: string; full_name: string; email: string; role: string; created_at: string; companies: { name: string } | null };

const PLAN_CFG: Record<string,{label:string;color:string}> = {
  free:       { label:'Free',       color:'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  starter:    { label:'Starter',    color:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  pro:        { label:'Pro',        color:'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  enterprise: { label:'Enterprise', color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

const ROLE_MAP: Record<string,{l:string;v:BadgeVariant}> = {
  super_admin:{l:'Super Admin',v:'error'},
  admin:      {l:'Admin',      v:'info'},
  manager:    {l:'Manager',    v:'info'},
  agent:      {l:'Agent',      v:'warning'},
  viewer:     {l:'Viewer',     v:'default'},
};

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [stats, setStats] = useState({ total:0, active:0, users:0, thisMonth:0 });
  const [planDist, setPlanDist] = useState<Record<string,number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    const sb = createClient();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    Promise.all([
      sb.from('companies').select('id,name,plan,is_active,created_at,email').order('created_at',{ascending:false}),
      sb.from('users').select('id,full_name,email,role,created_at,companies(name)').order('created_at',{ascending:false}).limit(8),
      sb.from('users').select('id',{count:'exact',head:true}),
      sb.from('companies').select('id',{count:'exact',head:true}).gte('created_at',monthStart.toISOString()),
    ]).then(([{data:c},{data:u},{count:uc},{count:mc}]) => {
      const cos = (c||[]) as Company[];
      setCompanies(cos);
      setRecentUsers((u||[]) as RecentUser[]);
      const dist: Record<string,number> = {};
      cos.forEach(co => { dist[co.plan] = (dist[co.plan]||0)+1; });
      setPlanDist(dist);
      setStats({ total:cos.length, active:cos.filter(co=>co.is_active).length, users:uc||0, thisMonth:mc||0 });
      setLoading(false);
    });
  }, [user?.role]);

  if (user?.role !== 'super_admin') return <div className="text-center py-16 text-muted-foreground">Acces non autorise</div>;
  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Super Admin" subtitle="Vue globale de la plateforme"
        actions={<Link href="/super-admin/companies/new" className={btnPrimary}><Building2 size={16} />Nouvelle entreprise</Link>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Entreprises" value={stats.total} icon={<Building2 size={20}/>} color="blue"/>
        <StatCard title="Actives" value={stats.active} icon={<CheckCircle size={20}/>} color="green"
          subtitle={stats.total>0 ? Math.round(stats.active/stats.total*100)+'% du total' : ''}/>
        <StatCard title="Utilisateurs" value={stats.users} icon={<Users size={20}/>} color="purple"/>
        <StatCard title="Ce mois" value={stats.thisMonth} icon={<TrendingUp size={20}/>} color="orange" subtitle="Nouvelles entreprises"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan distribution */}
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity size={16} className="text-primary"/> Repartition des plans
          </h3>
          <div className="space-y-3">
            {Object.entries(PLAN_CFG).map(([plan,cfg]) => {
              const count = planDist[plan]||0;
              const pct = stats.total>0 ? Math.round(count/stats.total*100) : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={'text-xs font-semibold px-2 py-0.5 rounded-full '+cfg.color}>{cfg.label}</span>
                    <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{width:pct+'%'}}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between text-xs">
            <span className="text-green-600 font-medium">{stats.active} actives</span>
            <span className="text-red-500 font-medium">{stats.total-stats.active} suspendues</span>
          </div>
        </div>

        {/* Recent companies */}
        <div className={cardCls+' lg:col-span-2'}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Entreprises recentes</h3>
            <Link href="/super-admin/companies" className="text-xs text-primary hover:underline">Voir tout</Link>
          </div>
          <div className="divide-y divide-border">
            {companies.slice(0,7).map(c => {
              const plan = PLAN_CFG[c.plan]||PLAN_CFG.starter;
              return (
                <Link key={c.id} href={'/super-admin/companies/'+c.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-blue-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email||'—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={'text-xs font-medium px-2 py-0.5 rounded-full '+plan.color}>{plan.label}</span>
                    <span className={'w-2 h-2 rounded-full '+(c.is_active?'bg-green-500':'bg-slate-300')}/>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent users */}
      <div className={cardCls}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Derniers utilisateurs</h3>
          <Link href="/super-admin/users" className="text-xs text-primary hover:underline">Voir tout</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-2.5 font-semibold">Utilisateur</th>
                <th className="text-left px-4 py-2.5 font-semibold">Entreprise</th>
                <th className="text-left px-4 py-2.5 font-semibold">Role</th>
                <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">Statut</th>
                <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentUsers.map(u => {
                const rc = ROLE_MAP[u.role]||{l:u.role,v:'default' as BadgeVariant};
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{u.full_name||'—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{(u as any).companies?.name||'—'}</td>
                    <td className="px-4 py-3"><Badge variant={rc.v}>{rc.l}</Badge></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Badge variant="success">Actif</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatDate(u.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}