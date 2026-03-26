'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Home, Users, FileText, CreditCard, Wrench, BarChart3,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X,
  Truck, Building2, Receipt, MessageSquare, FileCheck, Bell,
  TrendingUp, Globe, Shield, Crown, Lock, LayoutDashboard,
  Settings, ScrollText, ClipboardCheck, CalendarRange, PieChart,
  FileSignature, Calculator, Factory, Package, Hammer, AlertTriangle,
  Wallet, UserCog, Phone, FlaskConical, Gauge,
  ShoppingCart, Banknote, MapPin,
} from 'lucide-react';
import { getBrandingColors, getCompanyDisplayName, getCompanyInitial } from '@/lib/branding';
import { useAuthStore, UserRole } from '@/lib/store';
import { getNavItems } from '@/lib/permissions';

type NavItem  = { href: string; label: string; icon: React.ReactNode; key: string };
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

// ─── SARPA IMMOBILIER ──────────────────────────────────────────
const ALL_RE_ITEMS: NavItem[] = [
  { key: 'dashboard',        href: '/real-estate',                   label: 'Tableau de bord',        icon: <Home size={15} /> },
  { key: 'properties',       href: '/real-estate/properties',        label: 'Biens immobiliers',       icon: <Building2 size={15} /> },
  { key: 'apartments',       href: '/real-estate/properties',        label: 'Appartements',            icon: <Home size={15} /> },
  { key: 'tenants',          href: '/real-estate/tenants',           label: 'Locataires',              icon: <Users size={15} /> },
  { key: 'notices',          href: '/real-estate/notices',           label: 'Preavis & sorties',       icon: <Bell size={15} /> },
  { key: 'leases',           href: '/real-estate/leases',            label: 'Contrats de bail',        icon: <FileText size={15} /> },
  { key: 'inspections',      href: '/real-estate/inspections',       label: 'Etats des lieux',         icon: <ClipboardCheck size={15} /> },
  { key: 'terminations',     href: '/real-estate/terminations',      label: 'Resiliations',            icon: <ScrollText size={15} /> },
  { key: 'convention',       href: '/real-estate/convention',        label: 'Conventions',             icon: <FileSignature size={15} /> },
  { key: 'payments',         href: '/real-estate/payments',          label: 'Loyers',                  icon: <CreditCard size={15} /> },
  { key: 'onlinePayment',    href: '/real-estate/online-payment',    label: 'Paiement en ligne',       icon: <Globe size={15} /> },
  { key: 'expenses',         href: '/real-estate/expenses',          label: 'Depenses',                icon: <Receipt size={15} /> },
  { key: 'accounting',       href: '/real-estate/accounting',        label: 'Comptabilite',            icon: <Calculator size={15} /> },
  { key: 'disbursements',    href: '/real-estate/disbursements',     label: 'Reversements',            icon: <Building2 size={15} /> },
  { key: 'maintenance',      href: '/real-estate/messages',          label: 'Signalements',            icon: <Wrench size={15} /> },
  { key: 'notifications',    href: '/real-estate/messages',          label: 'Messagerie locataires',   icon: <MessageSquare size={15} /> },
  { key: 'weeklyOutings',    href: '/real-estate/weekly-outings',    label: 'Sorties hebdomadaires',   icon: <CalendarRange size={15} /> },
  { key: 'analytics',        href: '/real-estate/analytics',         label: 'Analyse financiere',      icon: <TrendingUp size={15} /> },
  { key: 'stats',            href: '/real-estate/stats',             label: 'Statistiques',            icon: <BarChart3 size={15} /> },
  { key: 'reports',          href: '/real-estate/reports',           label: 'Rapports financiers',     icon: <PieChart size={15} /> },
  { key: 'reports-terrain',  href: '/real-estate/reports-terrain',   label: 'Rapports terrain',        icon: <Camera size={15} /> },
  { key: 'documents',        href: '/real-estate/documents',         label: 'Documents PDF',           icon: <FileCheck size={15} /> },
  { key: 'contractTemplate', href: '/admin/contract-template',       label: 'Modeles de contrat',      icon: <ScrollText size={15} /> },
  { key: 'messages',         href: '/real-estate/messages',          label: 'Messagerie',              icon: <MessageSquare size={15} /> },
  { key: 'settings',         href: '/admin/settings',                label: 'Parametres',              icon: <Settings size={15} /> },
];

const RE_GROUP_MAP: { label: string; keys: string[]; adminOnly?: boolean }[] = [
  { label: 'Dashboard',   keys: ['dashboard'] },
  { label: 'Biens',       keys: ['properties','apartments','tenants','notices','leases','inspections','terminations','convention'] },
  { label: 'Paiements',   keys: ['payments','onlinePayment','expenses','accounting','disbursements'] },
  { label: 'Locataires',  keys: ['maintenance','notifications'] },
  { label: 'Activites',   keys: ['weeklyOutings'] },
  { label: 'Analyse',     keys: ['analytics','stats','reports','reports-terrain'] },
  { label: 'Documents',   keys: ['documents','contractTemplate'], adminOnly: true },
  { label: 'Parametres',  keys: ['settings'], adminOnly: true },
];

// ─── SARPA LOGISTIQUES ─────────────────────────────────────────
const LOG_NAV: NavGroup[] = [
  { label: 'Operations', items: [
    { key: 'dashboard',  href: '/logistics',             label: 'Tableau de bord',     icon: <Home size={15} /> },
    { key: 'deliveries', href: '/logistics/deliveries',  label: 'Livraisons',          icon: <Truck size={15} /> },
    { key: 'orders',     href: '/logistics/orders',      label: 'Commandes clients',   icon: <ShoppingCart size={15} /> },
    { key: 'clients',    href: '/logistics/clients',     label: 'Clients',             icon: <Users size={15} /> },
  ]},
  { label: 'Flotte', items: [
    { key: 'fleet',      href: '/logistics/fleet',       label: 'Camions & vehicules', icon: <Truck size={15} /> },
    { key: 'drivers',    href: '/logistics/drivers',     label: 'Chauffeurs',          icon: <UserCog size={15} /> },
    { key: 'gps',        href: '/logistics/shipments',   label: 'Suivi GPS',           icon: <MapPin size={15} /> },
    { key: 'accidents',  href: '/logistics/warehouse',   label: 'Accidents',           icon: <AlertTriangle size={15} /> },
  ]},
  { label: 'Stock', items: [
    { key: 'warehouse',  href: '/logistics/warehouse',   label: 'Stock maintenance',   icon: <Package size={15} /> },
    { key: 'stockvente', href: '/logistics/warehouse',   label: 'Stock vente',         icon: <Package size={15} /> },
  ]},
  { label: 'Finance', items: [
    { key: 'finance',    href: '/logistics/stats',       label: 'Comptes & banques',   icon: <Banknote size={15} /> },
    { key: 'dettes',     href: '/logistics/stats',       label: 'Dettes clients',      icon: <Wallet size={15} /> },
    { key: 'stats',      href: '/logistics/stats',       label: 'Statistiques',        icon: <BarChart3 size={15} /> },
  ]},
  { label: 'RH & Contacts', items: [
    { key: 'annuaire',   href: '/logistics/drivers',     label: 'Annuaire',            icon: <Phone size={15} /> },
  ]},
];

// ─── SARPA BETON (NOUVEAU MODULE) ─────────────────────────────
const BETON_NAV: NavGroup[] = [
  { label: 'Dashboard', items: [
    { key: 'dashboard',    href: '/beton',                  label: 'Tableau de bord',     icon: <Home size={15} /> },
  ]},
  { label: 'Production', items: [
    { key: 'production',   href: '/beton/production',       label: 'Suivi production',    icon: <Gauge size={15} /> },
    { key: 'qualite',      href: '/beton/qualite',          label: 'Controle qualite',    icon: <FlaskConical size={15} /> },
    { key: 'planning',     href: '/beton/planning',         label: 'Planning',            icon: <CalendarRange size={15} /> },
  ]},
  { label: 'Stock', items: [
    { key: 'matieres',     href: '/beton/stock/matieres',   label: 'Matieres premieres',  icon: <Package size={15} /> },
    { key: 'produits',     href: '/beton/stock/produits',   label: 'Produits finis',      icon: <Package size={15} /> },
  ]},
  { label: 'Commercial', items: [
    { key: 'commandes',    href: '/beton/commandes',        label: 'Commandes',           icon: <ShoppingCart size={15} /> },
    { key: 'livraisons',   href: '/beton/livraisons',       label: 'Livraisons',          icon: <Truck size={15} /> },
    { key: 'clients',      href: '/beton/clients',          label: 'Clients',             icon: <Users size={15} /> },
    { key: 'factures',     href: '/beton/factures',         label: 'Factures',            icon: <FileText size={15} /> },
  ]},
  { label: 'Flotte & Maintenance', items: [
    { key: 'flotte',       href: '/beton/flotte',           label: 'Flotte camions',      icon: <Truck size={15} /> },
    { key: 'maintenance',  href: '/beton/maintenance',      label: 'Maintenance machines',icon: <Hammer size={15} /> },
    { key: 'accidents',    href: '/beton/accidents',        label: 'Accidents',           icon: <AlertTriangle size={15} /> },
  ]},
  { label: 'Finance & RH', items: [
    { key: 'finance',      href: '/beton/finance',          label: 'Finance',             icon: <Banknote size={15} /> },
    { key: 'dettes',       href: '/beton/finance',          label: 'Dettes',              icon: <Wallet size={15} /> },
    { key: 'employes',     href: '/beton/employes',         label: 'Employes',            icon: <Users size={15} /> },
  ]},
  { label: 'Rapports', items: [
    { key: 'stats',        href: '/beton/stats',            label: 'Statistiques',        icon: <BarChart3 size={15} /> },
    { key: 'rapports',     href: '/beton/rapports',         label: 'Rapports',            icon: <PieChart size={15} /> },
    { key: 'documents',    href: '/beton/documents',        label: 'Documents PDF',       icon: <FileCheck size={15} /> },
  ]},
];

// ─── SUPER ADMIN ───────────────────────────────────────────────
const SA_NAV: NavGroup[] = [
  { label: 'SARPA GROUP', items: [
    { key: 'dashboard',   href: '/super-admin/dashboard',   label: 'Tableau de bord',     icon: <LayoutDashboard size={15} /> },
    { key: 'companies',   href: '/super-admin/companies',   label: 'Filiales',            icon: <Building2 size={15} /> },
    { key: 'users',       href: '/super-admin/users',       label: 'Utilisateurs',        icon: <Users size={15} /> },
  ]},
  { label: 'Securite', items: [
    { key: 'roles',       href: '/super-admin/roles',       label: 'Roles',               icon: <Shield size={15} /> },
    { key: 'permissions', href: '/super-admin/permissions', label: 'Permissions',         icon: <Lock size={15} /> },
    { key: 'settings',    href: '/super-admin/settings',    label: 'Parametres globaux',  icon: <Settings size={15} /> },
  ]},
];

// ─── FILIALES PICKER (accueil dashboard) ──────────────────────
const FILIALES = [
  { module: 'real_estate', href: '/real-estate', icon: <Building2 size={18} />, name: 'SARPA Immobilier',   sub: 'Biens & locataires' },
  { module: 'beton',       href: '/beton',       icon: <Factory size={18} />,   name: 'SARPA Béton',        sub: 'Production & stock' },
  { module: 'logistics',   href: '/logistics',   icon: <Truck size={18} />,     name: 'SARPA Logistiques',  sub: 'Flotte & livraisons' },
];

// ─── COMPOSANTS PARTAGÉS ──────────────────────────────────────
function BrandLogo({ companyName, companyInitial, logoUrl }: { companyName: string; companyInitial: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={companyName} className="w-8 h-8 rounded-lg object-cover bg-white/15 p-0.5 flex-shrink-0" />;
  }
  if (companyInitial === 'SG') {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
        <span className="absolute text-base font-black leading-none" style={{ color: '#faab2d', left: '3px', top: '3px', fontFamily: 'Georgia, serif' }}>S</span>
        <span className="absolute text-base font-black leading-none" style={{ color: 'rgba(255,255,255,0.90)', right: '3px', bottom: '3px', fontFamily: 'Georgia, serif' }}>G</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-xs"
      style={{ background: 'linear-gradient(135deg, #faab2d, #f59e0b)', color: '#1a1040' }}>
      {companyInitial}
    </div>
  );
}

function NavGroupComp({ group, collapsed, pathname, onNav }: {
  group: NavGroup; collapsed: boolean; pathname: string; onNav?: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (group.items.length === 0) return null;

  return (
    <div className="mb-1">
      {!collapsed && (
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors"
          style={{ color: 'var(--sidebar-muted)' }}>
          <span>{group.label}</span>
          {open ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}
        </button>
      )}
      <AnimatePresence initial={false}>
        {(open || collapsed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            {group.items.map(item => {
              const isRoot = ['/real-estate','/logistics','/beton','/super-admin/dashboard'].includes(item.href);
              const active = isRoot ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.key + item.href} href={item.href} onClick={onNav}
                  title={collapsed ? item.label : undefined}
                  className={'flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 text-[13px] font-medium transition-all ' +
                    (active ? '' : 'hover:bg-[var(--sidebar-hover)]')}
                  style={active
                    ? { backgroundColor: 'var(--sidebar-active)', color: 'var(--sidebar-active-text)', boxShadow: '0 4px 12px rgba(250,171,45,0.30)' }
                    : { color: 'var(--sidebar-muted)' }}>
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
  const isRE    = pathname.startsWith('/real-estate') || pathname.startsWith('/admin');
  const isLog   = pathname.startsWith('/logistics');
  const isBeton = pathname.startsWith('/beton');
  const isSA    = pathname.startsWith('/super-admin');
  const allowedKeys  = ['dashboard', ...getNavItems(role)];
  const isAdmin      = role === 'admin' || role === 'manager';
  const isSuperAdmin = role === 'super_admin';
  const hasRE    = isSuperAdmin ? true : (company?.modules?.includes('real_estate') ?? false);
  const hasLog   = isSuperAdmin ? true : (company?.modules?.includes('logistics') ?? false);
  const hasBeton = isSuperAdmin ? true : ((company?.modules as string[] | undefined)?.includes('beton') ?? false);

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

  const nav = isRE ? reNav : isLog ? LOG_NAV : isBeton ? BETON_NAV : isSA ? SA_NAV : null;

  const moduleInfo = isRE
    ? { name: 'SARPA Immobilier',   subtitle: 'Gestion immobilière',   icon: <Building2 size={13}/> }
    : isLog
      ? { name: 'SARPA Logistiques', subtitle: 'Flotte & livraisons',   icon: <Truck size={13}/> }
      : isBeton
        ? { name: 'SARPA Béton',     subtitle: 'Production & qualité',  icon: <Factory size={13}/> }
        : isSA
          ? { name: 'Super Admin',   subtitle: 'SARPA GROUP',            icon: <Crown size={13}/> }
          : null;

  return (
    <>
      {!collapsed && moduleInfo && (
        <div className="mx-3 mt-3 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(250,171,45,0.15)', border: '1px solid rgba(250,171,45,0.2)' }}>
          <span style={{ color: '#faab2d' }}>{moduleInfo.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: '#faab2d' }}>{moduleInfo.name}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--sidebar-muted)' }}>{moduleInfo.subtitle}</p>
          </div>
        </div>
      )}

      {!collapsed && user && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ background: 'var(--sidebar-hover)' }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: '#faab2d', color: '#1a1040' }}>
            {(user.full_name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>
              {user.full_name?.split(' ')[0] || '—'}
            </p>
            <p className="text-[10px] capitalize" style={{ color: 'var(--sidebar-muted)' }}>
              {user.role?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {nav ? (
          nav.map(g => <NavGroupComp key={g.label} group={g} collapsed={collapsed} pathname={pathname} onNav={onNav}/>)
        ) : (
          /* Accueil — sélecteur de filiale */
          <div className="space-y-2 pt-2">
            {FILIALES.filter(f => {
              if (f.module === 'real_estate') return hasRE;
              if (f.module === 'logistics')   return hasLog;
              if (f.module === 'beton')       return hasBeton;
              return false;
            }).map(f => (
              <Link key={f.module} href={f.href} onClick={onNav}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl font-semibold transition-all border"
                style={{ color: 'var(--sidebar-text)', backgroundColor: 'var(--sidebar-hover)', borderColor: 'var(--sidebar-border)' }}>
                <span className="flex-shrink-0" style={{ color: '#faab2d' }}>{f.icon}</span>
                {!collapsed && (
                  <div>
                    <p className="font-bold text-sm">{f.name}</p>
                    <p className="text-xs font-normal" style={{ color: 'var(--sidebar-muted)' }}>{f.sub}</p>
                  </div>
                )}
              </Link>
            ))}
            {isSuperAdmin && (
              <Link href="/super-admin/dashboard" onClick={onNav}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl font-semibold transition-all border"
                style={{ color: 'var(--sidebar-text)', backgroundColor: 'var(--sidebar-hover)', borderColor: 'var(--sidebar-border)' }}>
                <Crown size={18} className="flex-shrink-0" style={{ color: '#faab2d' } as any}/>
                {!collapsed && (
                  <div>
                    <p className="font-bold text-sm">Super Admin</p>
                    <p className="text-xs font-normal" style={{ color: 'var(--sidebar-muted)' }}>Administration ERP</p>
                  </div>
                )}
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Liens inter-modules en bas */}
      {!collapsed && nav && (
        <div className="px-3 py-3 border-t flex flex-col gap-1" style={{ borderColor: 'var(--sidebar-border)' }}>
          {isSuperAdmin && !isSA && (
            <Link href="/super-admin/dashboard" onClick={onNav}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-[var(--sidebar-hover)]"
              style={{ color: 'var(--sidebar-muted)' }}>
              <Crown size={12}/> Super Admin
            </Link>
          )}
          {(isRE || isLog || isBeton) && (
            <Link href="/dashboard" onClick={onNav}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-[var(--sidebar-hover)]"
              style={{ color: 'var(--sidebar-muted)' }}>
              <LayoutDashboard size={12}/> Changer de filiale
            </Link>
          )}
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { company, user } = useAuthStore();
  const isSuperAdmin  = user?.role === 'super_admin';
  const companyName   = isSuperAdmin ? 'SARPA GROUP' : getCompanyDisplayName(company);
  const companyInitial = isSuperAdmin ? 'SG' : getCompanyInitial(company);
  const baseColors = getBrandingColors(company);
  const colors = isSuperAdmin
    ? { ...baseColors, sidebarActive: '#faab2d', sidebarActiveText: '#1a1040' }
    : baseColors;

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 236 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex h-screen flex-shrink-0 border-r flex-col overflow-hidden z-40"
      style={{
        backgroundColor: colors.sidebarBg,
        borderColor: colors.sidebarBorder,
        ['--sidebar-bg' as any]:          colors.sidebarBg,
        ['--sidebar-text' as any]:        colors.sidebarText,
        ['--sidebar-muted' as any]:       colors.sidebarMuted,
        ['--sidebar-border' as any]:      colors.sidebarBorder,
        ['--sidebar-hover' as any]:       colors.sidebarHover,
        ['--sidebar-active' as any]:      colors.sidebarActive,
        ['--sidebar-active-text' as any]: colors.sidebarActiveText,
      }}
    >
      <div className="flex items-center justify-between px-3 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--sidebar-border)' }}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandLogo companyName={companyName} companyInitial={companyInitial} logoUrl={isSuperAdmin ? null : company?.logo_url}/>
              <div className="min-w-0">
                <p className="font-bold text-xs truncate" style={{ color: colors.sidebarText }}>{companyName}</p>
                {isSuperAdmin && (
                  <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: '#faab2d' }}>SENEGAL</p>
                )}
              </div>
            </div>
            <button onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--sidebar-hover)]"
              style={{ color: colors.sidebarMuted }}>
              <ChevronLeft size={15}/>
            </button>
          </>
        ) : (
          <button onClick={() => setCollapsed(false)}
            className="mx-auto p-1.5 rounded-lg transition-colors hover:bg-[var(--sidebar-hover)]"
            style={{ color: colors.sidebarText }}>
            <ChevronRight size={15}/>
          </button>
        )}
      </div>
      <SidebarContent collapsed={collapsed}/>
    </motion.aside>
  );
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { company, user } = useAuthStore();
  const isSuperAdmin   = user?.role === 'super_admin';
  const companyName    = isSuperAdmin ? 'SARPA GROUP' : getCompanyDisplayName(company);
  const companyInitial = isSuperAdmin ? 'SG' : getCompanyInitial(company);
  const baseColors = getBrandingColors(company);
  const colors = isSuperAdmin
    ? { ...baseColors, sidebarActive: '#faab2d', sidebarActiveText: '#1a1040' }
    : baseColors;

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/50 z-50 md:hidden"/>
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 border-r z-50 flex flex-col md:hidden"
            style={{
              backgroundColor: colors.sidebarBg,
              borderColor: colors.sidebarBorder,
              ['--sidebar-bg' as any]:          colors.sidebarBg,
              ['--sidebar-text' as any]:        colors.sidebarText,
              ['--sidebar-muted' as any]:       colors.sidebarMuted,
              ['--sidebar-border' as any]:      colors.sidebarBorder,
              ['--sidebar-hover' as any]:       colors.sidebarHover,
              ['--sidebar-active' as any]:      colors.sidebarActive,
              ['--sidebar-active-text' as any]: colors.sidebarActiveText,
            }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--sidebar-border)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandLogo companyName={companyName} companyInitial={companyInitial} logoUrl={isSuperAdmin ? null : company?.logo_url}/>
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate" style={{ color: colors.sidebarText }}>{companyName}</p>
                  {isSuperAdmin && (
                    <p className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: '#faab2d' }}>SENEGAL</p>
                  )}
                </div>
              </div>
              <button onClick={onClose}
                className="p-2 rounded-xl transition-colors hover:bg-[var(--sidebar-hover)]"
                style={{ color: colors.sidebarText }}>
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
