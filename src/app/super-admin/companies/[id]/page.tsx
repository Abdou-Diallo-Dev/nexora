'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, ToggleLeft, ToggleRight, Users, Building2, Crown, Star, Zap, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Badge, LoadingSpinner, btnSecondary, btnPrimary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Company = { id: string; name: string; email: string|null; phone: string|null; address: string|null; plan: string; is_active: boolean; modules: string[]; created_at: string };
type CompanyUser = { id: string; full_name: string; email: string; role: string; is_active: boolean; created_at: string };

const PLAN_CFG: Record<string,{label:string;color:string;icon:React.ReactNode}> = {
  free:       { label:'Free',       color:'bg-slate-100 text-slate-600',   icon:<Shield size={13}/> },
  starter:    { label:'Starter',    color:'bg-blue-100 text-blue-700',     icon:<Zap size={13}/> },
  pro:        { label:'Pro',        color:'bg-purple-100 text-purple-700', icon:<Star size={13}/> },
  enterprise: { label:'Enterprise', color:'bg-amber-100 text-amber-700',   icon:<Crown size={13}/> },
};

const ROLE_MAP: Record<string,{l:string;v:BadgeVariant}> = {
  super_admin:{l:'Super Admin',v:'error'},
  admin:      {l:'Admin',      v:'info'},
  manager:    {l:'Manager',    v:'info'},
  agent:      {l:'Agent',      v:'warning'},
  viewer:     {l:'Viewer',     v:'default'},
};

const MODULE_LABELS: Record<string,string> = { real_estate:'Immobilier', logistics:'Logistique' };

export default function CompanyDetailPage() {
  const { id } = useParams<{id:string}>();
  const [c, setC] = useState<Company|null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from('companies').select('*').eq('id',id).maybeSingle(),
      sb.from('users').select('id,full_name,email,role,is_active,created_at').eq('company_id',id).order('created_at',{ascending:false}),
    ]).then(([{data:co},{data:us}]) => {
      setC(co as Company);
      setUsers((us||[]) as CompanyUser[]);
      setLoading(false);
    });
  }, [id]);

  const toggle = async () => {
    if (!c) return;
    setToggling(true);
    const sb = createClient();
    const newStatus = !c.is_active;
    await sb.from('companies').update({is_active:newStatus} as never).eq('id',id);
    // Sync all users of this company
    // Sync ALL users (admin + managers + agents + etc.)
    await sb.from('users').update({is_active:newStatus} as never).eq('company_id',id);
    setC(prev => prev ? {...prev,is_active:newStatus} : prev);
    toast.success(newStatus ? 'Entreprise activée — utilisateurs activés' : 'Entreprise suspendue — utilisateurs désactivés');
    setToggling(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;
  if (!c) return <div className="text-center py-16 text-muted-foreground">Entreprise introuvable</div>;

  const plan = PLAN_CFG[c.plan]||PLAN_CFG.starter;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin/companies" className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link>
        <div className="flex-1"/>
        <Link href={'/super-admin/companies/'+id+'/edit'} className={btnSecondary}>
          <Edit size={15}/> Modifier
        </Link>
        <button onClick={toggle} disabled={toggling}
          className={'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors '+(c.is_active?'bg-red-50 text-red-600 hover:bg-red-100':'bg-green-50 text-green-600 hover:bg-green-100')}>
          {toggling ? <LoadingSpinner size={15}/> : c.is_active ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
          {c.is_active ? 'Suspendre' : 'Activer'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company info */}
        <div className="lg:col-span-2 space-y-5">
          <div className={cardCls+' p-5'}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Building2 size={24} className="text-blue-600"/>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">{c.name}</h1>
                <p className="text-sm text-muted-foreground">{c.email||'—'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full '+plan.color}>
                    {plan.icon} {plan.label}
                  </span>
                  <Badge variant={c.is_active?'success':'default'}>{c.is_active?'Active':'Suspendue'}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              {[
                ['Telephone', c.phone||'—'],
                ['Adresse',   c.address||'—'],
                ['Cree le',   formatDate(c.created_at)],
                ['Utilisateurs', users.length+' compte(s)'],
              ].map(([l,v]) => (
                <div key={l}>
                  <p className="text-xs text-muted-foreground mb-0.5">{l}</p>
                  <p className="text-sm font-medium text-foreground">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3">Modules actives</h3>
            <div className="flex flex-wrap gap-2">
              {(c.modules||[]).map(m => (
                <span key={m} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-sm font-medium">
                  {m==='real_estate'?<Building2 size={14}/>:null}
                  {MODULE_LABELS[m]||m}
                </span>
              ))}
              {(c.modules||[]).length===0 && <p className="text-sm text-muted-foreground">Aucun module</p>}
            </div>
          </div>
        </div>

        {/* Change plan */}
        <div className={cardCls+' p-5 h-fit'}>
          <h3 className="font-semibold text-foreground mb-3">Plan d'abonnement</h3>
          <div className="space-y-2">
            {Object.entries(PLAN_CFG).map(([planKey,cfg]) => (
              <button key={planKey} onClick={async () => {
                await createClient().from('companies').update({plan:planKey} as never).eq('id',id);
                setC(prev => prev ? {...prev,plan:planKey} : prev);
                toast.success('Plan mis a jour : '+cfg.label);
              }}
                className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left '+(c.plan===planKey?'border-primary bg-blue-50 dark:bg-blue-900/20':'border-border hover:border-primary/40')}>
                <span className={'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full '+cfg.color}>
                  {cfg.icon} {cfg.label}
                </span>
                {c.plan===planKey && <span className="ml-auto text-xs text-primary font-semibold">Actuel</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users of this company */}
      <div className={cardCls}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users size={16} className="text-primary"/> Utilisateurs ({users.length})
          </h3>
          <Link href={'/super-admin/users?company_id='+id} className="text-xs text-primary hover:underline">Gerer</Link>
        </div>
        {users.length===0
          ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun utilisateur</p>
          : (
            <div className="divide-y divide-border">
              {users.map(u => {
                const rm = ROLE_MAP[u.role]||{l:u.role,v:'default' as BadgeVariant};
                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                      {(u.full_name||u.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{u.full_name||'—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rm.v}>{rm.l}</Badge>
                      <Badge variant={u.is_active?'success':'default'}>{u.is_active?'Actif':'Inactif'}</Badge>
                      <span className="text-xs text-muted-foreground hidden md:block">{formatDate(u.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}