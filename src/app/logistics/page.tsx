'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, Users, MapPin, CheckCircle, Clock, AlertTriangle, TrendingUp, Plus, ArrowRight, Wrench } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard, LoadingSpinner, Badge, cardCls, btnPrimary } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_MAP: Record<string,{l:string;v:any;color:string}> = {
  pending:     { l:'En attente',  v:'warning', color:'#f59e0b' },
  assigned:    { l:'Assigné',     v:'info',    color:'#3d2674' },
  in_progress: { l:'En cours',    v:'info',    color:'#8b5cf6' },
  delivered:   { l:'Livré',       v:'success', color:'#22c55e' },
  failed:      { l:'Échec',       v:'error',   color:'#ef4444' },
  cancelled:   { l:'Annulé',      v:'default', color:'#94a3b8' },
};

export default function LogisticsDashboard() {
  const { company, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total:0, pending:0, inProgress:0, delivered:0, failed:0, drivers:0, availableDrivers:0, vehicles:0, availableVehicles:0, todayRevenue:0, monthRevenue:0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [chart, setChart] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{type:string;message:string}[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    const cid = company.id;
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    Promise.all([
      sb.from('deliveries').select('id,status,final_price,created_at,payment_status').eq('company_id', cid),
      sb.from('drivers').select('id,status,first_name,last_name').eq('company_id', cid),
      sb.from('vehicles').select('id,status,type,insurance_expiry,inspection_expiry').eq('company_id', cid),
      sb.from('deliveries').select('id,reference,status,final_price,created_at,pickup_city,delivery_city,priority,logistics_clients(name)').eq('company_id', cid).order('created_at', { ascending: false }).limit(8),
    ]).then(([{data:D},{data:Dr},{data:V},{data:R}]) => {
      const deliveries = D||[];
      const drivers = Dr||[];
      const vehicles = V||[];
      const now = new Date();

      // Stats
      const todayRev = deliveries.filter((d:any) => d.created_at?.startsWith(today) && d.payment_status==='paid').reduce((s:number,d:any)=>s+Number(d.final_price||0),0);
      const monthRev = deliveries.filter((d:any) => new Date(d.created_at) >= new Date(monthStart) && d.payment_status==='paid').reduce((s:number,d:any)=>s+Number(d.final_price||0),0);

      setStats({
        total: deliveries.length,
        pending: deliveries.filter((d:any)=>d.status==='pending').length,
        inProgress: deliveries.filter((d:any)=>d.status==='in_progress'||d.status==='assigned').length,
        delivered: deliveries.filter((d:any)=>d.status==='delivered').length,
        failed: deliveries.filter((d:any)=>d.status==='failed').length,
        drivers: drivers.length,
        availableDrivers: drivers.filter((d:any)=>d.status==='available').length,
        vehicles: vehicles.length,
        availableVehicles: vehicles.filter((v:any)=>v.status==='available').length,
        todayRevenue: todayRev, monthRevenue: monthRev,
      });

      setRecent((R||[]) as any[]);

      // Chart 7 days
      const chartData = Array.from({length:7},(_,i)=>{
        const d = subDays(now, 6-i);
        const day = d.toISOString().split('T')[0];
        const count = deliveries.filter((del:any)=>del.created_at?.startsWith(day)).length;
        const rev = deliveries.filter((del:any)=>del.created_at?.startsWith(day)&&del.payment_status==='paid').reduce((s:number,del:any)=>s+Number(del.final_price||0),0);
        return { day: format(d,'EEE',{locale:fr}), livraisons: count, revenus: rev };
      });
      setChart(chartData);

      // Alerts
      const alts: {type:string;message:string}[] = [];
      const expiringSoon = vehicles.filter((v:any) => {
        if (!v.insurance_expiry) return false;
        const diff = (new Date(v.insurance_expiry).getTime() - now.getTime()) / (1000*60*60*24);
        return diff >= 0 && diff <= 30;
      });
      if (expiringSoon.length > 0) alts.push({ type:'warning', message:`${expiringSoon.length} véhicule(s) avec assurance expirant dans 30 jours` });
      if (deliveries.filter((d:any)=>d.status==='failed').length > 0) alts.push({ type:'error', message:`${deliveries.filter((d:any)=>d.status==='failed').length} livraison(s) en échec à traiter` });
      if (drivers.filter((d:any)=>d.status==='available').length === 0) alts.push({ type:'warning', message:'Aucun chauffeur disponible actuellement' });
      setAlerts(alts);
      setLoading(false);
    },
    (err: any) => { 
      console.error('Erreur dashboard:', err); 
      setAlerts([{type:'error', message:'Erreur chargement données: ' + (err?.message || 'requête échouée')}]);
      setLoading(false); 
    });
  }, [company?.id]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;

  const successRate = stats.total > 0 ? Math.round((stats.delivered/stats.total)*100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord Logistique 🚛</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue globale de vos opérations</p>
        </div>
        <Link href="/logistics/deliveries/new" className={btnPrimary}><Plus size={16}/> Nouvelle livraison</Link>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a,i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${a.type==='error'?'bg-red-50 border-red-200 dark:bg-red-900/20':'bg-amber-50 border-amber-200 dark:bg-amber-900/20'}`}>
              <AlertTriangle size={16} className={a.type==='error'?'text-red-600':'text-amber-600'}/>
              <p className={`text-sm font-medium ${a.type==='error'?'text-red-700':'text-amber-700'}`}>{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title:'Total livraisons', value:stats.total, subtitle:`${stats.pending} en attente`, icon:<Package size={20}/>, color:'purple' as const, href:'/logistics/deliveries' },
          { title:'En cours', value:stats.inProgress, subtitle:`${stats.pending} assignées`, icon:<Truck size={20}/>, color:'purple' as const, href:'/logistics/deliveries' },
          { title:'Chauffeurs dispo', value:`${stats.availableDrivers}/${stats.drivers}`, subtitle:'Disponibles maintenant', icon:<Users size={20}/>, color:'green' as const, href:'/logistics/drivers' },
          { title:'Véhicules dispo', value:`${stats.availableVehicles}/${stats.vehicles}`, subtitle:'En flotte', icon:<Truck size={20}/>, color:'orange' as const, href:'/logistics/fleet' },
        ].map((k,i) => (
          <motion.div key={k.title} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}>
            <Link href={k.href}><StatCard title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} color={k.color}/></Link>
          </motion.div>
        ))}
      </div>

      {/* Revenus + Taux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:"Revenus aujourd'hui", value:formatCurrency(stats.todayRevenue), color:'text-green-700', bg:'bg-green-50 dark:bg-green-900/20 border-green-100' },
          { label:'Revenus du mois', value:formatCurrency(stats.monthRevenue), color:'text-purple-700', bg:'bg-purple-50 dark:bg-purple-900/20 border-purple-100' },
          { label:'Taux de succès', value:`${successRate}%`, color:successRate>=80?'text-green-700':'text-amber-700', bg:successRate>=80?'bg-green-50 dark:bg-green-900/20 border-green-100':'bg-amber-50 dark:bg-amber-900/20 border-amber-100' },
          { label:'Échecs', value:String(stats.failed), color:stats.failed>0?'text-red-700':'text-green-700', bg:stats.failed>0?'bg-red-50 dark:bg-red-900/20 border-red-100':'bg-green-50 dark:bg-green-900/20 border-green-100' },
        ].map((k,i) => (
          <div key={i} className={`border rounded-2xl p-4 ${k.bg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${k.color}`}>{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={cardCls+' lg:col-span-2 p-5'}>
          <h3 className="font-semibold text-foreground mb-4">Activité — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart} barSize={20}>
              <XAxis dataKey="day" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip/>
              <Bar dataKey="livraisons" fill="#3d2674" radius={[4,4,0,0]} name="Livraisons"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className={cardCls+' p-5'}>
          <h3 className="font-semibold text-foreground mb-4">Actions rapides</h3>
          <div className="space-y-2">
            {[
              { href:'/logistics/deliveries/new', label:'Nouvelle livraison', icon:<Plus size={15}/>, cls:'text-purple-700 bg-purple-50 border-purple-100' },
              { href:'/logistics/drivers/new', label:'Ajouter chauffeur', icon:<Users size={15}/>, cls:'text-green-700 bg-green-50 border-green-100' },
              { href:'/logistics/fleet/new', label:'Ajouter véhicule', icon:<Truck size={15}/>, cls:'text-purple-700 bg-purple-50 border-purple-100' },
              { href:'/logistics/deliveries?status=pending', label:'Voir en attente', icon:<Clock size={15}/>, cls:'text-amber-700 bg-amber-50 border-amber-100' },
            ].map(a => (
              <Link key={a.href} href={a.href} className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors ${a.cls}`}>
                {a.icon}<span className="text-sm font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Specialized modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.06}}>
          <Link href="/logistics/stats" className={cardCls+' block p-5 hover:shadow-lg transition-shadow group'}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 group-hover:from-purple-200 group-hover:to-purple-100 transition-colors">
                <TrendingUp size={18} className="text-purple-600"/>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform"/>
            </div>
            <h4 className="font-semibold text-foreground mb-1">Statistiques</h4>
            <p className="text-xs text-muted-foreground">KPIs, graphiques et rapports d'activité</p>
          </Link>
        </motion.div>

        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.12}}>
          <Link href="/logistics/stock/maintenance" className={cardCls+' block p-5 hover:shadow-lg transition-shadow group'}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 group-hover:from-purple-200 group-hover:to-purple-100 transition-colors">
                <Wrench size={18} className="text-purple-600"/>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform"/>
            </div>
            <h4 className="font-semibold text-foreground mb-1">Stock Maintenance</h4>
            <p className="text-xs text-muted-foreground">Gestion pièces détachées et pneus</p>
          </Link>
        </motion.div>

        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.18}}>
          <Link href="/logistics/stock/vente" className={cardCls+' block p-5 hover:shadow-lg transition-shadow group'}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-100 to-green-50 group-hover:from-green-200 group-hover:to-green-100 transition-colors">
                <Package size={18} className="text-green-600"/>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform"/>
            </div>
            <h4 className="font-semibold text-foreground mb-1">Stock Vente</h4>
            <p className="text-xs text-muted-foreground">Services et articles commerciaux</p>
          </Link>
        </motion.div>
      </div>

      {/* Recent deliveries */}
      <div className={cardCls}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Livraisons récentes</h3>
          <Link href="/logistics/deliveries" className="text-xs text-primary hover:underline">Voir toutes →</Link>
        </div>
        <div className="divide-y divide-border">
          {recent.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Aucune livraison</p>
          ) : recent.map((d:any) => {
            const sm = STATUS_MAP[d.status]||{l:d.status,v:'default',color:'#94a3b8'};
            return (
              <Link key={d.id} href={`/logistics/deliveries/${d.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${sm.color}20`}}>
                  <Package size={16} style={{color:sm.color}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{d.reference}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.logistics_clients?.name||'—'} · {d.pickup_city||'?'} → {d.delivery_city||'?'}</p>
                </div>
                {d.priority === 'urgent' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">URGENT</span>}
                {d.priority === 'express' && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">EXPRESS</span>}
                <Badge variant={sm.v}>{sm.l}</Badge>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(d.final_price||0)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}