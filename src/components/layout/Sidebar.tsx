'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera,
  Home, Users, FileText, CreditCard, Wrench, BarChart3,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X,
  Truck, MapPin, ShoppingCart, Box, Car, Building2, Receipt, MessageSquare,
  FileCheck, Bell, TrendingUp, Globe, Package,
  Shield, Crown, Lock, LayoutDashboard, Zap, Settings, ScrollText, ClipboardCheck,
  PieChart, DollarSign, FileSignature, Calculator,
} from 'lucide-react';
import { useAuthStore, UserRole } from '@/lib/store';
import { getNavItems } from '@/lib/permissions';

type NavItem  = { href: string; label: string; icon: React.ReactNode; key: string };
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

const ALL_RE_ITEMS: NavItem[] = [
  // Dashboard
  { key:'dashboard',        href:'/real-estate',                   label:'Tableau de bord',     icon:<Home size={15}/> },
  // Biens
  { key:'properties',       href:'/real-estate/properties',        label:'Biens immobiliers',   icon:<Building2 size={15}/> },
  { key:'apartments',       href:'/real-estate/properties',        label:'Appartements',        icon:<Home size={15}/> },
  { key:'tenants',          href:'/real-estate/tenants',           label:'Locataires',          icon:<Users size={15}/> },
  { key:'notices',          href:'/real-estate/notices',           label:'Préavis & Sorties',   icon:<Bell size={15}/> },
  { key:'leases',           href:'/real-estate/leases',            label:'Contrats de bail',    icon:<FileText size={15}/> },
  { key:'inspections',      href:'/real-estate/inspections',       label:'États des lieux',     icon:<ClipboardCheck size={15}/> },
  { key:'terminations',     href:'/real-estate/terminations',      label:'Résiliations',        icon:<ScrollText size={15}/> },
  { key:'convention',       href:'/real-estate/convention',        label:'Conventions',         icon:<FileSignature size={15}/> },
  // Paiements
  { key:'payments',         href:'/real-estate/payments',          label:'Loyers',              icon:<CreditCard size={15}/> },
  { key:'onlinePayment',    href:'/real-estate/online-payment',    label:'Paiement en ligne',   icon:<Globe size={15}/> },
  { key:'expenses',         href:'/real-estate/expenses',          label:'Dépenses',            icon:<Receipt size={15}/> },
  { key:'accounting',       href:'/real-estate/accounting',        label:'Comptabilité',         icon:<Calculator size={15}/> },
  { key:'disbursements',    href:'/real-estate/disbursements',     label:'Reversements',         icon:<Building2 size={15}/> },
  // Locataires
  { key:'maintenance',      href:'/real-estate/messages',          label:'Signalements',        icon:<Wrench size={15}/> },
  { key:'notifications',    href:'/real-estate/messages',          label:'Messagerie locataires', icon:<MessageSquare size={15}/> },
  // Analyse
  { key:'analytics',        href:'/real-estate/analytics',         label:'Analyse financière',  icon:<TrendingUp size={15}/> },
  { key:'stats',            href:'/real-estate/stats',             label:'Statistiques',        icon:<BarChart3 size={15}/> },
  { key:'reports',          href:'/real-estate/reports',           label:'Rapports financiers', icon:<PieChart size={15}/> },
  { key:'reports-terrain',  href:'/real-estate/reports-terrain',   label:'Rapports terrain',    icon:<Camera size={15}/> },
  // Documents
  { key:'documents',        href:'/real-estate/documents',         label:'Documents PDF',       icon:<FileCheck size={15}/> },
  { key:'contractTemplate', href:'/admin/contract-template',       label:'Modèles de contrat',  icon:<ScrollText size={15}/> },
  // Communication
  { key:'messages',         href:'/real-estate/messages',          label:'Messagerie',          icon:<MessageSquare size={15}/> },
  // Paramètres
  { key:'settings',         href:'/admin/settings',                label:'Paramètres généraux', icon:<Settings size={15}/> },
];

const RE_GROUP_MAP: { label: string; keys: string[]; adminOnly?: boolean }[] = [
  { label:'Dashboard',     keys:['dashboard'] },
  { label:'Biens',         keys:['properties','apartments','tenants','notices','leases','inspections','terminations','convention'] },
  { label:'Paiements',     keys:['payments','onlinePayment','expenses','accounting','disbursements'] },
  { label:'Locataires',    keys:['maintenance','notifications'] },
  { label:'Analyse',       keys:['analytics','stats','reports','reports-terrain'] },
  { label:'Documents',     keys:['documents','contractTemplate'], adminOnly: true },
  { label:'Communication', keys:['messages'] },
  { label:'Paramètres',    keys:['settings'], adminOnly: true },
];

const LOG_NAV: NavGroup[] = [
  { label:'Operations', items:[
    { key:'dashboard',  href:'/logistics',                label:'Tableau de bord', icon:<Home size={15}/> },
    { key:'deliveries', href:'/logistics/deliveries',     label:'Livraisons',      icon:<Package size={15}/> },
    { key:'clients',    href:'/logistics/clients',        label:'Clients',         icon:<Users size={15}/> },
  ]},
  { label:'Ressources', items:[
    { key:'drivers',   href:'/logistics/drivers',   label:'Chauffeurs',       icon:<Users size={15}/> },
    { key:'fleet',     href:'/logistics/fleet',     label:'Flotte véhicules', icon:<Truck size={15}/> },
    { key:'stats',     href:'/logistics/stats',     label:'Statistiques',     icon:<BarChart3 size={15}/> },
  ]},
];

const SA_NAV: NavGroup[] = [
  { label:'Plateforme', items:[
    { key:'dashboard', href:'/super-admin/dashboard', label:'Tableau de bord', icon:<LayoutDashboard size={15}/> },
    { key:'companies', href:'/super-admin/companies', label:'Entreprises',     icon:<Building2 size={15}/> },
    { key:'users',     href:'/super-admin/users',     label:'Utilisateurs',    icon:<Users size={15}/> },
  ]},
  { label:'Sécurité', items:[
    { key:'roles',       href:'/super-admin/roles',       label:'Rôles',       icon:<Shield size={15}/> },
    { key:'permissions', href:'/super-admin/permissions', label:'Permissions', icon:<Lock size={15}/> },
  ]},
];

function NavGroupComp({ group, collapsed, pathname, onNav }: {
  group: NavGroup; collapsed: boolean; pathname: string; onNav?: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (group.items.length === 0) return null;
  return (
    <div className="mb-1">
      {!collapsed && (
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors">
          <span>{group.label}</span>
          {open ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
        </button>
      )}
      <AnimatePresence initial={false}>
        {(open || collapsed) && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            transition={{duration:0.15}} style={{overflow:'hidden'}}>
            {group.items.map(item => {
              const isRoot = ['/real-estate','/logistics','/super-admin/dashboard'].includes(item.href);
              const active = isRoot ? pathname===item.href : pathname===item.href || pathname.startsWith(item.href+'/');
              return (
                <Link key={item.href} href={item.href} onClick={onNav}
                  title={collapsed ? item.label : undefined}
                  className={'flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 text-[13px] font-medium transition-colors '+(
                    active ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  )}>
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const pathname = usePathname();
  const { user, company } = useAuthStore();
  const role = (user?.role || 'viewer') as UserRole;
  const isRE  = pathname.startsWith('/real-estate') || pathname.startsWith('/admin');
  const isLog = pathname.startsWith('/logistics');
  const isSA  = pathname.startsWith('/super-admin');
  const allowedKeys = ['dashboard', ...getNavItems(role)];
  const isAdmin = role === 'admin' || role === 'manager';
  const isSuperAdmin = role === 'super_admin';
  const hasRE  = isSuperAdmin ? true : (company?.modules?.includes('real_estate') ?? false);
  const hasLog = isSuperAdmin ? true : (company?.modules?.includes('logistics')   ?? false);

  const reNav: NavGroup[] = RE_GROUP_MAP.map(g => ({
    label: g.label,
    items: g.keys
      .filter(k => {
        if (g.adminOnly && !isAdmin && !isSuperAdmin) return false;
        return allowedKeys.includes(k) || g.adminOnly;
      })
      .map(k => ALL_RE_ITEMS.find(i => i.key === k)!)
      .filter(Boolean),
  })).filter(g => g.items.length > 0);

  const nav = isRE ? reNav : isLog ? LOG_NAV : isSA ? SA_NAV : null;

  const moduleInfo = isRE
    ? { name:'Nexora Immo',       badge:'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',     icon:<Building2 size={13}/> }
    : isLog
    ? { name:'Nexora Logistique', badge:'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300', icon:<Truck size={13}/> }
    : isSA
    ? { name:'Super Admin',       badge:'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',         icon:<Crown size={13}/> }
    : null;

  return (
    <>
      {!collapsed && moduleInfo && (
        <div className={'mx-3 mt-3 mb-2 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 '+moduleInfo.badge}>
          {moduleInfo.icon} {moduleInfo.name}
        </div>
      )}
      {!collapsed && user && (
        <div className="mx-3 mb-2 px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-700/30 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
            {(user.full_name||user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user.full_name?.split(' ')[0]||'—'}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user.role?.replace('_',' ')}</p>
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {nav ? (
          nav.map(g => <NavGroupComp key={g.label} group={g} collapsed={collapsed} pathname={pathname} onNav={onNav}/>)
        ) : (
          <div className="space-y-2 pt-2">
            {hasRE && (
              <Link href="/real-estate" onClick={onNav}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 transition-colors border border-blue-100 dark:border-blue-800">
                <Building2 size={18} className="flex-shrink-0"/>
                {!collapsed && <div><p className="font-bold text-sm">Nexora Immo</p><p className="text-xs font-normal text-blue-500">Gestion immobilière</p></div>}
              </Link>
            )}
            {hasLog && (
              <Link href="/logistics" onClick={onNav}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl font-semibold text-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 transition-colors border border-green-100 dark:border-green-800">
                <Truck size={18} className="flex-shrink-0"/>
                {!collapsed && <div><p className="font-bold text-sm">Nexora Logistique</p><p className="text-xs font-normal text-green-500">Flotte et livraisons</p></div>}
              </Link>
            )}
            {role === 'super_admin' && (
              <Link href="/super-admin/dashboard" onClick={onNav}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl font-semibold text-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors border border-red-100 dark:border-red-800">
                <Crown size={18} className="flex-shrink-0"/>
                {!collapsed && <div><p className="font-bold text-sm">Super Admin</p><p className="text-xs font-normal text-red-400">Administration</p></div>}
              </Link>
            )}
          </div>
        )}
      </nav>
      {!collapsed && nav && role === 'super_admin' && !isSA && (
        <div className="px-3 py-3 border-t border-border">
          <Link href="/super-admin/dashboard" onClick={onNav} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 transition-colors font-medium">
            <Crown size={13}/> Super Admin
          </Link>
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <motion.aside
      animate={{width: collapsed ? 60 : 236}}
      transition={{duration:0.2,ease:'easeInOut'}}
      className="hidden md:flex h-screen flex-shrink-0 bg-white dark:bg-slate-800 border-r border-border flex-col overflow-hidden z-40">
      <div className="flex items-center justify-between px-3 py-4 border-b border-border flex-shrink-0">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="text-white"/>
              </div>
              <span className="font-bold text-foreground text-sm">Nexora</span>
            </div>
            <button onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors">
              <ChevronLeft size={15}/>
            </button>
          </>
        ) : (
          <button onClick={() => setCollapsed(false)} className="mx-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground">
            <ChevronRight size={15}/>
          </button>
        )}
      </div>
      <SidebarContent collapsed={collapsed}/>
    </motion.aside>
  );
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50 md:hidden"/>
          <motion.div
            initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}}
            transition={{type:'spring',damping:28,stiffness:300}}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 border-r border-border z-50 flex flex-col md:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <Zap size={14} className="text-white"/>
                </div>
                <span className="font-bold text-foreground text-sm">Nexora</span>
              </div>
              <button onClick={onClose}
                className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X size={18}/>
              </button>
            </div>
            <SidebarContent collapsed={false} onNav={onClose}/>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}