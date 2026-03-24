'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Users, CreditCard, Wrench, AlertTriangle, Clock, FileText, ChevronLeft, ChevronRight, MapPin, CalendarRange } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculateCommission, computeLandlordNet } from '@/lib/commission';
import { useAuthStore, UserRole } from '@/lib/store';
import { StatCard, LoadingSpinner, Badge, cardCls, btnPrimary } from '@/components/ui';
import { formatCurrency, formatDate, getPropertyTypeLabel } from '@/lib/utils';
import { getDashboardSections, can, isExecutiveRole } from '@/lib/permissions';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type KPIs = {
  totalProps: number; rentedProps: number; availableProps: number;
  activeTenants: number; monthlyRevenue: number; pendingAmount: number;
  overdueAmount: number; openTickets: number;
  totalCommissions: number; totalDepenses: number; totalRestitue: number; tauxRecouvrement: number;
  latePayments: { id:string; tenant:string; amount:number; period_month:number; period_year:number }[];
  tenantTickets: { id:string; title:string; category:string; priority:string; tenant:string; created_at:string }[];
  expiringLeases: { id:string; tenant:string; property:string; end_date:string }[];
  overdueRents: { id:string; tenant:string; amount:number; period_month:number; period_year:number }[];
  weeklyOutingsCount: number;
  outingsByRole: { role:string; count:number }[];
  chart: { month:string; revenue:number }[];
};

type PropertySlide = {
  id:string; name:string; address:string; city:string; type:string;
  status:string; rent_amount:number; rooms_count:number|null; image_urls:string[]|null;
};

const STATUS: Record<string,any> = {
  available:   { label:'Disponible',  variant:'success' },
  rented:      { label:'Loué',        variant:'info'    },
  maintenance: { label:'Maintenance', variant:'warning' },
  inactive:    { label:'Inactif',     variant:'default' },
};

const ROLE_WELCOME: Record<string,string> = {
  admin:   'Acces complet — toutes les fonctionnalites disponibles',
  manager: 'Gestion operationnelle — biens, locataires, paiements, maintenance',
  agent:   'Espace agent — paiements et tickets de maintenance',
  viewer:  'Mode lecture — consultation uniquement, aucune modification',
};

const EXECUTIVE_WELCOME: Record<string, string> = {
  pdg: 'Vue executive - synthese, statistiques et rapports financiers uniquement',
  responsable_operations: 'Vue operationnelle - indicateurs et rapports en lecture seule',
};

export default function REDashboard() {
  const { company, user } = useAuthStore();
  const [data, setData] = useState<KPIs|null>(null);
  const [properties, setProperties] = useState<PropertySlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [imgIndexes, setImgIndexes] = useState<Record<string,number>>({});
  const autoRef = useRef<NodeJS.Timeout|null>(null);

  const role = (user?.role || 'viewer') as UserRole;
  const executiveView = isExecutiveRole(role);
  const sections = getDashboardSections(role);
  const roleWelcome = ROLE_WELCOME[role] || EXECUTIVE_WELCOME[role] || 'Tableau de bord Nexora Immo';

  useEffect(() => {
    if (properties.length <= 1) return;
    autoRef.current = setInterval(() => setSlideIndex(i => (i+1) % properties.length), 4000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [properties.length]);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    const cid = company.id;

    sb.from('properties')
      .select('id,name,address,city,type,status,rent_amount,rooms_count,image_urls')
      .eq('company_id', cid).order('created_at', { ascending:false }).limit(10)
      .then(({ data: p }) => setProperties((p||[]) as PropertySlide[]));

    Promise.all([
      sb.from('properties').select('id,status').eq('company_id', cid),
      sb.from('leases').select('id,status,end_date,rent_amount,tenant_id,tenants(first_name,last_name),properties(address)').eq('company_id', cid),
      sb.from('rent_payments').select('id,amount,status,period_month,period_year,tenant_id').eq('company_id', cid).limit(500),
      sb.from('tenant_tickets').select('id,status').eq('company_id', cid),
      sb.from('expenses').select('id,type,amount').eq('company_id', cid).limit(500),
      sb.from('companies').select('commission_rate,commission_mode,vat_rate').eq('id', cid).maybeSingle(),
      sb.from('tenant_tickets').select('id,title,category,priority,status,created_at,tenants(first_name,last_name)').eq('company_id', cid).eq('status','open').order('created_at',{ascending:false}).limit(5),
      sb.from('field_activities').select('id,activity_date,role_label').eq('company_id', cid).limit(300),
    ]).then(([{data:propsD},{data:leases},{data:payments},{data:tickets},{data:exps},{data:compD},{data:tenantTix},{data:outingsD,error:outingsErr}]) => {
      const P   = (propsD  ||[]) as any[];
      const L   = (leases  ||[]) as any[];
      const PAY = (payments||[]) as any[];
      const T   = (tickets ||[]) as any[];
      const E   = (exps    ||[]) as any[];
      const TX  = (tenantTix||[]) as any[];
      const OUT = outingsErr ? [] : ((outingsD||[]) as any[]);

      const companyCommission = compD as any;
      const now = new Date();
      const thisMonth = `${now.getMonth()+1}/${now.getFullYear()}`;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      weekStart.setHours(0,0,0,0);

      const allPaid    = PAY.filter((p:any) => p.status==='paid');
      const allPending = PAY.filter((p:any) => p.status==='pending');
      const allOverdue = PAY.filter((p:any) => p.status==='late'||p.status==='overdue');
      const thisMonthPaid = allPaid.filter((p:any) => `${p.period_month}/${p.period_year}`===thisMonth);

      const monthlyRevenue = thisMonthPaid.reduce((s:number,p:any) => s+Number(p.amount), 0);
      const totalLoyers    = allPaid.reduce((s:number,p:any) => s+Number(p.amount), 0);
      const totalComm      = calculateCommission(totalLoyers, companyCommission).landlordCommission;
      const totalDep       = E.reduce((s:number,e:any) => s+Number(e.amount), 0);
      const bailleurDep    = E.filter((e:any)=>e.type==='bailleur').reduce((s:number,e:any) => s+Number(e.amount), 0);
      const totalRestitue  = computeLandlordNet(totalLoyers, bailleurDep, companyCommission);
      const tauxRecouvrement = PAY.length > 0 ? Math.round((allPaid.length/PAY.length)*100) : 0;

      const activeLeases = L.filter((l:any) => l.status==='active');

      const chart = Array.from({length:6},(_,i) => {
        const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
        const mo = `${d.getMonth()+1}/${d.getFullYear()}`;
        return { month:format(d,'MMM',{locale:fr}), revenue:allPaid.filter((p:any)=>`${p.period_month}/${p.period_year}`===mo).reduce((s:number,p:any)=>s+Number(p.amount),0) };
      });

      const outingsByRole = Object.entries(
        OUT.reduce((acc: Record<string, number>, outing: any) => {
          const key = outing.role_label || 'Autre';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).map(([role, count]) => ({ role, count }));

      const result: KPIs = {
        totalProps:    P.length,
        rentedProps:   P.filter((p:any)=>p.status==='rented').length,
        availableProps:P.filter((p:any)=>p.status==='available').length,
        activeTenants: activeLeases.length,
        monthlyRevenue,
        pendingAmount: allPending.reduce((s:number,p:any)=>s+Number(p.amount),0),
        overdueAmount: allOverdue.reduce((s:number,p:any)=>s+Number(p.amount),0),
        openTickets:   T.filter((t:any)=>t.status==='open'||t.status==='in_progress').length,
        totalCommissions: totalComm,
        totalDepenses:    totalDep,
        totalRestitue,
        tauxRecouvrement,
        latePayments: allOverdue.slice(0,5).map((r:any) => {
          const lease = L.find((l:any) => l.tenant_id===r.tenant_id);
          const t = (lease as any)?.tenants;
          return { id:r.id, tenant:t?`${t.first_name||''} ${t.last_name||''}`.trim():'Locataire', amount:Number(r.amount), period_month:r.period_month, period_year:r.period_year };
        }),
        tenantTickets: TX.map((t:any)=>({ id:t.id, title:t.title, category:t.category, priority:t.priority, tenant:`${t.tenants?.first_name||''} ${t.tenants?.last_name||''}`, created_at:t.created_at })),
        expiringLeases: activeLeases
          .filter((l:any) => { const d=new Date(l.end_date); const diff=(d.getTime()-now.getTime())/86400000; return diff>=0&&diff<=60; })
          .map((l:any) => ({ id:l.id, tenant:`${l.tenants?.first_name||''} ${l.tenants?.last_name||''}`, property:l.properties?.address||'', end_date:l.end_date })),
        overdueRents: allOverdue.slice(0,5).map((r:any) => {
          const lease = L.find((l:any) => l.tenant_id===r.tenant_id);
          const t = (lease as any)?.tenants;
          return { id:r.id, tenant:t?`${t.first_name||''} ${t.last_name||''}`.trim():'Locataire', amount:Number(r.amount), period_month:r.period_month, period_year:r.period_year };
        }),
        weeklyOutingsCount: OUT.filter((outing:any) => new Date(outing.activity_date) >= weekStart).length,
        outingsByRole,
        chart,
      };

      setData(result);
      setLoading(false);
    });
  }, [company?.id]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;
  if (!data) return null;

  const occupancy = data.totalProps > 0 ? Math.round((data.rentedProps/data.totalProps)*100) : 0;
  const pieData = [
    { name:'Loues',       value:data.rentedProps,    color:'#3b82f6' },
    { name:'Disponibles', value:data.availableProps, color:'#22c55e' },
    { name:'Autres',      value:Math.max(0,data.totalProps-data.rentedProps-data.availableProps), color:'#94a3b8' },
  ].filter(d=>d.value>0);

  const prevSlide = () => { if(autoRef.current)clearInterval(autoRef.current); setSlideIndex(i=>(i-1+properties.length)%properties.length); };
  const nextSlide = () => { if(autoRef.current)clearInterval(autoRef.current); setSlideIndex(i=>(i+1)%properties.length); };
  const setImgIdx = (id:string, idx:number) => setImgIndexes(p=>({...p,[id]:idx}));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour, {user?.full_name?.split(' ')[0]||'Utilisateur'} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{roleWelcome}</p>
        </div>
        {can.createPayment(role) && (
          <Link href="/real-estate/payments/new" className={btnPrimary}><CreditCard size={16}/> Enregistrer paiement</Link>
        )}
      </div>

      {/* Role banner */}
      {(role==='agent'||role==='viewer'||executiveView) && (
        <div className={`px-4 py-3 rounded-2xl border text-sm flex items-center gap-2 ${
          executiveView
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
            : role==='viewer'
              ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
        }`}>
          {executiveView ? '📊 ' : role==='viewer' ? '👁 ' : '⚡ '}<span>{roleWelcome}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { show:true, title:'Biens immobiliers', value:data.totalProps, subtitle:data.rentedProps+' loues · '+data.availableProps+' disponibles', icon:<Home size={20}/>, color:'blue' as const, href:'/real-estate/properties' },
          { show:true, title:'Locataires actifs', value:data.activeTenants, subtitle:'Contrats en cours', icon:<Users size={20}/>, color:'green' as const, href:'/real-estate/tenants' },
          { show:sections.showRevenue, title:'Revenus du mois', value:formatCurrency(data.monthlyRevenue), subtitle:formatCurrency(data.pendingAmount)+' en attente', icon:<CreditCard size={20}/>, color:'purple' as const, href:'/real-estate/payments' },
          { show:true, title:'Signalements', value:data.openTickets, subtitle:'Tickets locataires ouverts', icon:<Wrench size={20}/>, color:'orange' as const, href:'/real-estate/messages' },
        ].filter(k=>k.show).map((k,i) => (
          <motion.div key={k.title} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
            <Link href={k.href}><StatCard title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} color={k.color}/></Link>
          </motion.div>
        ))}
      </div>

      {(role==='agent' || role==='manager' || role==='comptable' || role==='admin' || role==='super_admin') && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px,1fr]">
          <Link href="/real-estate/weekly-outings">
            <StatCard title="Sorties cette semaine" value={data.weeklyOutingsCount} subtitle="Visites, prospections et dépôts" icon={<CalendarRange size={20}/>} color="cyan"/>
          </Link>
          <div className={cardCls+' p-5'}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Statistiques des sorties</h3>
                <p className="text-xs text-muted-foreground">Répartition par rôle</p>
              </div>
              <Link href="/real-estate/weekly-outings" className="text-xs text-primary hover:underline">Voir le module</Link>
            </div>
            {data.outingsByRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune sortie enregistrée pour le moment.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.outingsByRole.map((item) => (
                  <div key={item.role} className="rounded-xl border border-border bg-slate-50 dark:bg-slate-700/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.role}</p>
                    <p className="text-xl font-bold text-foreground mt-1">{item.count}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accounting KPIs */}
      {sections.showRevenue && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title:'Commissions générées', value:formatCurrency(data.totalCommissions), color:'text-blue-700', bg:'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
            { title:'Total dépenses', value:formatCurrency(data.totalDepenses), color:'text-red-700', bg:'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
            { title:'À reverser bailleurs', value:formatCurrency(data.totalRestitue), color:'text-purple-700', bg:'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' },
            { title:'Taux de recouvrement', value:data.tauxRecouvrement+'%', color:data.tauxRecouvrement>=80?'text-green-700':'text-amber-700', bg:data.tauxRecouvrement>=80?'bg-green-50 dark:bg-green-900/20 border-green-100':'bg-amber-50 dark:bg-amber-900/20 border-amber-100' },
          ].map((k,i) => (
            <Link key={i} href="/real-estate/accounting">
              <div className={`border rounded-2xl p-4 cursor-pointer hover:opacity-90 transition-opacity ${k.bg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${k.color}`}>{k.title}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Late payments alert */}
      {sections.showPendingRents && data.latePayments && data.latePayments.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600 flex-shrink-0"/>
            <p className="text-sm font-bold text-red-700">{data.latePayments.length} paiement(s) en retard</p>
          </div>
          <div className="space-y-2">
            {data.latePayments.map(r => (
              <Link key={r.id} href="/real-estate/payments" className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                  <p className="text-xs font-medium text-foreground">{r.tenant}</p>
                  <p className="text-xs text-muted-foreground">{r.period_month}/{r.period_year}</p>
                </div>
                <span className="text-xs font-bold text-red-600">{formatCurrency(r.amount)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {sections.showPendingRents && data.overdueAmount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0"/>
          <p className="text-sm text-red-800 dark:text-red-300">
            <span className="font-semibold">{formatCurrency(data.overdueAmount)}</span> de loyers en retard — {data.overdueRents.length} locataire(s)
          </p>
        </div>
      )}

      {/* SLIDER BIENS */}
      {properties.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Biens récents</h2>
            <Link href="/real-estate/properties" className="text-xs text-primary hover:underline">Voir tous →</Link>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              {properties.map((p,pi) => {
                const imgs = p.image_urls&&p.image_urls.length>0 ? p.image_urls : [];
                const imgIdx = imgIndexes[p.id]||0;
                const st = STATUS[p.status]||{ label:p.status, variant:'default' };
                return (
                  <motion.div key={p.id} initial={{opacity:0}} animate={{opacity:pi===slideIndex?1:0}} style={{display:pi===slideIndex?'block':'none'}} className="relative">
                    <Link href={'/real-estate/properties/'+p.id}>
                      <div className="relative w-full h-64 md:h-80 bg-slate-100 dark:bg-slate-700">
                        {imgs.length>0 ? <img src={imgs[imgIdx]} alt={p.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Home size={48} className="text-slate-300"/></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>
                        <div className="absolute top-4 left-4"><Badge variant={st.variant}>{st.label}</Badge></div>
                        {imgs.length>1 && <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{imgIdx+1}/{imgs.length} 📷</div>}
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <p className="font-bold text-lg">{p.name}</p>
                          <p className="text-sm opacity-80 flex items-center gap-1"><MapPin size={12}/>{p.address}, {p.city}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-70">{getPropertyTypeLabel(p.type)}{p.rooms_count?' · '+p.rooms_count+' pièces':''}</span>
                            <span className="font-bold text-lg">{formatCurrency(p.rent_amount)}/mois</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    {imgs.length>1 && (
                      <>
                        <button onClick={e=>{e.preventDefault();setImgIdx(p.id,(imgIdx-1+imgs.length)%imgs.length);}} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center z-10"><ChevronLeft size={16}/></button>
                        <button onClick={e=>{e.preventDefault();setImgIdx(p.id,(imgIdx+1)%imgs.length);}} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center z-10"><ChevronRight size={16}/></button>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
            {properties.length>1 && (
              <>
                <button onClick={prevSlide} className="absolute -left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white dark:bg-slate-800 shadow-lg border border-border text-foreground rounded-full flex items-center justify-center z-20 hover:bg-slate-50 transition-colors"><ChevronLeft size={18}/></button>
                <button onClick={nextSlide} className="absolute -right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white dark:bg-slate-800 shadow-lg border border-border text-foreground rounded-full flex items-center justify-center z-20 hover:bg-slate-50 transition-colors"><ChevronRight size={18}/></button>
              </>
            )}
            {properties.length>1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {properties.map((_,i) => <button key={i} onClick={()=>setSlideIndex(i)} className={'h-1.5 rounded-full transition-all '+(i===slideIndex?'w-6 bg-primary':'w-1.5 bg-slate-300')}/>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      {sections.showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={cardCls+' lg:col-span-2 p-5'}>
            <h3 className="font-semibold text-foreground mb-4">Revenus — 6 derniers mois</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.chart} barSize={28}>
                <XAxis dataKey="month" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>(v/1000).toFixed(0)+'k'} tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v:number)=>formatCurrency(v)}/>
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} name="Revenus"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3">Occupation</h3>
            <div className="flex flex-col items-center">
              <div className="relative">
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx={66} cy={66} innerRadius={44} outerRadius={60} paddingAngle={3} dataKey="value">
                    {pieData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{occupancy}%</p>
                    <p className="text-xs text-muted-foreground">occupe</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mt-3 w-full">
                {pieData.map(d=>(
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}}/>
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring leases + overdue rents */}
      {sections.showExpiring && (data.expiringLeases.length>0||data.overdueRents.length>0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.expiringLeases.length>0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={15} className="text-amber-600"/>
                <h3 className="font-semibold text-amber-800 dark:text-amber-400 text-sm">Baux expirant bientot ({data.expiringLeases.length})</h3>
              </div>
              <div className="space-y-2">
                {data.expiringLeases.map(l=>(
                  <Link key={l.id} href={'/real-estate/leases/'+l.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl hover:shadow-sm transition-shadow">
                    <div><p className="text-xs font-medium text-foreground">{l.tenant}</p><p className="text-xs text-muted-foreground">{l.property}</p></div>
                    <span className="text-xs font-bold text-amber-600">{formatDate(l.end_date)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {data.overdueRents.length>0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-red-600"/>
                <h3 className="font-semibold text-red-800 dark:text-red-400 text-sm">Loyers en retard ({data.overdueRents.length})</h3>
              </div>
              <div className="space-y-2">
                {data.overdueRents.map(r=>(
                  <Link key={r.id} href="/real-estate/payments" className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl hover:shadow-sm transition-shadow">
                    <div><p className="text-xs font-medium text-foreground">{r.tenant}</p><p className="text-xs text-muted-foreground">{r.period_month}/{r.period_year}</p></div>
                    <span className="text-xs font-bold text-red-600">{formatCurrency(r.amount)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tenant tickets */}
      {data.tenantTickets && data.tenantTickets.length>0 && (
        <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wrench size={15} className="text-orange-500"/>
              <h3 className="font-semibold text-foreground text-sm">Signalements locataires ({data.tenantTickets.length})</h3>
            </div>
            <Link href="/real-estate/messages" className="text-xs text-primary hover:underline">Gérer →</Link>
          </div>
          <div className="space-y-2">
            {data.tenantTickets.map(t => {
              const pc: Record<string,string> = { low:'text-green-600', normal:'text-amber-600', high:'text-orange-600', urgent:'text-red-600' };
              const pe: Record<string,string> = { low:'🟢', normal:'🟡', high:'🟠', urgent:'🔴' };
              return (
                <Link key={t.id} href="/real-estate/messages" className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{pe[t.priority]||'⚪'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.tenant} · {t.category}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ml-2 ${pc[t.priority]||''}`}>{t.priority==='urgent'?'URGENT':t.priority}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent actions */}
      {role==='agent' && (
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-3">Vos actions disponibles</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/real-estate/payments/new" className="flex items-center gap-2.5 p-4 rounded-2xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700"><CreditCard size={16}/><span className="text-sm font-medium">Enregistrer paiement</span></Link>
            <Link href="/real-estate/maintenance/new" className="flex items-center gap-2.5 p-4 rounded-2xl border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors text-orange-700"><Wrench size={16}/><span className="text-sm font-medium">Nouveau ticket</span></Link>
            <Link href="/real-estate/payments" className="flex items-center gap-2.5 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700"><CreditCard size={16}/><span className="text-sm font-medium">Voir paiements</span></Link>
            <Link href="/real-estate/maintenance" className="flex items-center gap-2.5 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700"><Wrench size={16}/><span className="text-sm font-medium">Voir maintenance</span></Link>
          </div>
        </div>
      )}

      {/* Executive */}
      {executiveView && (
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-3">Acces direction</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href:'/real-estate/analytics', label:'Analyse financiere', icon:<CreditCard size={16}/>, cls:'text-blue-700 bg-blue-50 border-blue-100' },
              { href:'/real-estate/stats', label:'Statistiques', icon:<Home size={16}/>, cls:'text-emerald-700 bg-emerald-50 border-emerald-100' },
              { href:'/real-estate/reports', label:'Rapports financiers', icon:<FileText size={16}/>, cls:'text-purple-700 bg-purple-50 border-purple-100' },
            ].map(item=>(
              <Link key={item.href} href={item.href} className={'flex items-center gap-2.5 p-4 rounded-2xl border transition-colors '+item.cls}>
                {item.icon}<span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Viewer */}
      {role==='viewer' && (
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-3">Acces en lecture seule</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href:'/real-estate/properties', label:'Biens',      icon:<Home size={16}/>,     cls:'text-blue-700 bg-blue-50 border-blue-100' },
              { href:'/real-estate/tenants',    label:'Locataires', icon:<Users size={16}/>,    cls:'text-green-700 bg-green-50 border-green-100' },
              { href:'/real-estate/leases',     label:'Contrats',   icon:<FileText size={16}/>, cls:'text-purple-700 bg-purple-50 border-purple-100' },
              { href:'/real-estate/maintenance',label:'Maintenance', icon:<Wrench size={16}/>,  cls:'text-orange-700 bg-orange-50 border-orange-100' },
            ].map(item=>(
              <Link key={item.href} href={item.href} className={'flex items-center gap-2.5 p-4 rounded-2xl border transition-colors '+item.cls}>
                {item.icon}<span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {sections.showQuickActions && role!=='agent' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href:'/real-estate/properties/new', label:'Nouveau bien',      icon:<Home size={16}/>,       cls:'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100' },
            { href:'/real-estate/tenants/new',    label:'Nouveau locataire', icon:<Users size={16}/>,      cls:'text-green-600 bg-green-50 hover:bg-green-100 border-green-100' },
            { href:'/real-estate/leases/new',     label:'Nouveau bail',      icon:<FileText size={16}/>,   cls:'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100' },
            { href:'/real-estate/payments/new',   label:'Paiement',          icon:<CreditCard size={16}/>, cls:'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100' },
          ].map(item=>(
            <Link key={item.href} href={item.href} className={'flex items-center gap-2.5 p-4 rounded-2xl border transition-all '+item.cls}>
              {item.icon}<span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
