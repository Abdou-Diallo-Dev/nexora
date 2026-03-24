'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, AlertTriangle, Clock, UserX, Home, Phone, Mail, CheckCircle, TrendingDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, Badge, BadgeVariant } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Notice = {
  id:string; type:string; notice_date:string; exit_date:string|null;
  reason:string|null; status:string; created_at:string;
  tenants:{id:string;first_name:string;last_name:string;phone:string|null;email:string|null}|null;
  leases:{properties:{name:string}|null}|null;
};

type TenantRisk = {
  id:string; first_name:string; last_name:string; phone:string|null;
  risk_level:string; notice_date:string|null; exit_date:string|null;
  late_payments:number; lease?:{properties:{name:string}|null}|null;
};

const TYPE_MAP: Record<string,{l:string;color:string;icon:React.ReactNode;v:BadgeVariant}> = {
  notice:    { l:'Préavis',     color:'bg-amber-50 border-amber-200',  icon:<Clock size={16} className="text-amber-600"/>,      v:'warning' },
  expulsion: { l:'Expulsion',   color:'bg-red-50 border-red-200',      icon:<UserX size={16} className="text-red-600"/>,         v:'error' },
  departure: { l:'Départ',      color:'bg-blue-50 border-blue-200',    icon:<Home size={16} className="text-blue-600"/>,         v:'info' },
  renewal:   { l:'Renouvellement', color:'bg-green-50 border-green-200', icon:<CheckCircle size={16} className="text-green-600"/>, v:'success' },
};

const RISK_MAP: Record<string,{l:string;color:string;v:BadgeVariant}> = {
  normal:    { l:'Normal',      color:'text-slate-600',  v:'default' },
  at_risk:   { l:'À risque',    color:'text-amber-600',  v:'warning' },
  notice:    { l:'En préavis',  color:'text-orange-600', v:'warning' },
  expulsion: { l:'Expulsion',   color:'text-red-600',    v:'error' },
};

export default function NoticesPage() {
  const { company } = useAuthStore();
  const [notices, setNotices]     = useState<Notice[]>([]);
  const [atRisk, setAtRisk]       = useState<TenantRisk[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<'notices'|'risk'|'rotation'>('notices');
  const [stats, setStats]         = useState({ notices:0, expulsions:0, departures:0, rotation:0 });

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    Promise.all([
      sb.from('tenant_notices').select('id,type,notice_date,exit_date,reason,status,created_at,tenants(id,first_name,last_name,phone,email),leases(properties(name))')
        .eq('company_id', company.id).order('created_at',{ascending:false}),
      sb.from('tenants').select('id,first_name,last_name,phone,risk_level,notice_date,exit_date')
        .eq('company_id', company.id).neq('risk_level','normal').order('risk_level'),
      // Late payment count per tenant
      sb.from('rent_payments').select('tenant_id,status').eq('company_id', company.id).in('status',['late','overdue']),
    ]).then(([{data:n},{data:r},{data:lp}]) => {
      const noticeList = (n||[]) as unknown as Notice[];
      setNotices(noticeList);
      
      const lateByTenant: Record<string,number> = {};
      (lp||[]).forEach((p:any) => { lateByTenant[p.tenant_id] = (lateByTenant[p.tenant_id]||0)+1; });
      
      const riskList = ((r||[]) as unknown as TenantRisk[]).map(t => ({
        ...t, late_payments: lateByTenant[t.id]||0
      }));
      setAtRisk(riskList);
      
      setStats({
        notices: noticeList.filter(n=>n.type==='notice'&&n.status==='active').length,
        expulsions: noticeList.filter(n=>n.type==='expulsion'&&n.status==='active').length,
        departures: noticeList.filter(n=>n.type==='departure').length,
        rotation: riskList.length,
      });
      setLoading(false);
    });
  }, [company?.id]);

  const getDaysLeft = (exitDate: string) => {
    const diff = Math.ceil((new Date(exitDate).getTime() - Date.now()) / 86400000);
    return diff;
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <PageHeader title="Préavis & Sorties" subtitle="Gestion des départs et risques locatifs"
        actions={<Link href="/real-estate/notices/new" className={btnPrimary}><Plus size={16}/>Nouveau préavis</Link>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase mb-1 flex items-center gap-1"><Clock size={11}/>Préavis actifs</p>
          <p className="text-2xl font-bold text-amber-700">{stats.notices}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-red-700 uppercase mb-1 flex items-center gap-1"><UserX size={11}/>Expulsions</p>
          <p className="text-2xl font-bold text-red-700">{stats.expulsions}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase mb-1 flex items-center gap-1"><Home size={11}/>Départs prévus</p>
          <p className="text-2xl font-bold text-blue-700">{stats.departures}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-orange-700 uppercase mb-1 flex items-center gap-1"><TrendingDown size={11}/>À risque</p>
          <p className="text-2xl font-bold text-orange-700">{stats.rotation}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        {[
          {k:'notices', l:`Préavis & Expulsions (${notices.length})`},
          {k:'risk', l:`Locataires à risque (${atRisk.length})`},
          {k:'rotation', l:'Taux de rotation'},
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k as any)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab===t.k?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Notices tab */}
      {tab === 'notices' && (
        notices.length === 0 ? (
          <EmptyState icon={<Clock size={24}/>} title="Aucun préavis" description="Aucun préavis ou expulsion en cours"
            action={<Link href="/real-estate/notices/new" className={btnPrimary}><Plus size={16}/>Ajouter</Link>}/>
        ) : (
          <div className="space-y-3">
            {notices.map(n => {
              const tm = TYPE_MAP[n.type]||TYPE_MAP.notice;
              const daysLeft = n.exit_date ? getDaysLeft(n.exit_date) : null;
              return (
                <div key={n.id} className={`border rounded-2xl p-4 ${tm.color}`}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        {tm.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground">{n.tenants?.first_name} {n.tenants?.last_name}</p>
                          <Badge variant={tm.v}>{tm.l}</Badge>
                          <Badge variant={n.status==='active'?'warning':'default'}>{n.status==='active'?'Actif':'Terminé'}</Badge>
                        </div>
                        {n.leases?.properties && <p className="text-xs text-muted-foreground mt-0.5">🏠 {n.leases.properties.name}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">Préavis le : {formatDate(n.notice_date)}</p>
                        {n.reason && <p className="text-xs text-muted-foreground mt-1 italic">"{n.reason}"</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      {n.exit_date && (
                        <div className={`px-3 py-2 rounded-xl text-center ${daysLeft !== null && daysLeft <= 7 ? 'bg-red-100' : daysLeft !== null && daysLeft <= 30 ? 'bg-amber-100' : 'bg-white'}`}>
                          <p className="text-xs text-muted-foreground">Date de sortie</p>
                          <p className="font-bold text-sm">{formatDate(n.exit_date)}</p>
                          {daysLeft !== null && (
                            <p className={`text-xs font-semibold ${daysLeft <= 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-red-500' : daysLeft <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                              {daysLeft <= 0 ? '⚠️ Dépassé' : `J-${daysLeft}`}
                            </p>
                          )}
                        </div>
                      )}
                      {n.tenants?.phone && (
                        <a href={`tel:${n.tenants.phone}`} className="text-xs text-primary flex items-center gap-1 mt-2 justify-end"><Phone size={11}/>{n.tenants.phone}</a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Risk tab */}
      {tab === 'risk' && (
        atRisk.length === 0 ? (
          <EmptyState icon={<CheckCircle size={24}/>} title="Aucun locataire à risque" description="Tous vos locataires sont en règle ✓"/>
        ) : (
          <div className={cardCls}>
            <div className="divide-y divide-border">
              {atRisk.map(t => {
                const rm = RISK_MAP[t.risk_level]||RISK_MAP.normal;
                return (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${t.risk_level==='expulsion'?'bg-red-100 text-red-600':t.risk_level==='notice'?'bg-orange-100 text-orange-600':'bg-amber-100 text-amber-600'}`}>
                      {t.first_name.charAt(0)}{t.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{t.first_name} {t.last_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.late_payments > 0 && <span className="text-xs text-red-600 font-medium">{t.late_payments} paiement(s) en retard</span>}
                        {t.notice_date && <span className="text-xs text-muted-foreground">Préavis: {formatDate(t.notice_date)}</span>}
                        {t.exit_date && <span className="text-xs text-muted-foreground">Sortie: {formatDate(t.exit_date)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={rm.v}>{rm.l}</Badge>
                      <Link href={`/real-estate/notices/new?tenant=${t.id}`}
                        className="text-xs text-primary hover:underline">+ Préavis</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Rotation tab */}
      {tab === 'rotation' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className={cardCls+' p-5 text-center'}>
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Taux de rotation</p>
            <p className="text-4xl font-bold text-primary">{notices.filter(n=>n.type==='departure').length > 0 ? Math.round((notices.filter(n=>n.type==='departure').length / Math.max(1, notices.length)) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">Départs / Total préavis</p>
          </div>
          <div className={cardCls+' p-5 text-center'}>
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Sorties prévues</p>
            <p className="text-4xl font-bold text-amber-600">{notices.filter(n=>n.exit_date && getDaysLeft(n.exit_date) >= 0 && getDaysLeft(n.exit_date) <= 30).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Dans les 30 prochains jours</p>
          </div>
          <div className={cardCls+' p-5 text-center'}>
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Risque d'impayés</p>
            <p className="text-4xl font-bold text-red-600">{atRisk.filter(t=>t.late_payments > 0).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Locataires avec retards</p>
          </div>
        </div>
      )}
    </div>
  );
}