'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, Sun, Moon, LogOut, Settings, Menu, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getBrandingColors, getCompanyDisplayName, getCompanyInitial } from '@/lib/branding';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { formatDateRelative, getInitials } from '@/lib/utils';
import Link from 'next/link';
import { MobileDrawer } from './Sidebar';

const NX_BG     = '#1e40af';
const NX_ACCENT = '#93c5fd';
const NX_DARK   = '#1e3a8a';

type Notif = { id: string; title: string; message: string; type: string; is_read: boolean; created_at: string };

const MODULE_LABELS: Record<string, string> = {
  '/real-estate': 'Immobilier',
  '/beton':       'Beton',
  '/logistics':   'Logistiques',
  '/super-admin': 'Administration',
  '/admin':       'Parametres',
};

function getModuleLabel(pathname: string) {
  for (const [prefix, label] of Object.entries(MODULE_LABELS)) {
    if (pathname.startsWith(prefix)) return label;
  }
  return '';
}

export function Topbar() {
  const { user, company, reset } = useAuthStore();
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [unread, setUnread]       = useState(0);
  const [showN, setShowN]         = useState(false);
  const [showU, setShowU]         = useState(false);
  const [dark, setDark]           = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();
  const nRef = useRef<HTMLDivElement>(null);
  const uRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  // ── Couleurs dynamiques ──────────────────────────────────────
  const branding    = getBrandingColors(company);
  const accent      = isSuperAdmin ? NX_ACCENT          : branding.secondary;
  const accentText  = isSuperAdmin ? NX_DARK             : branding.secondaryText;
  const barFrom     = isSuperAdmin ? NX_DARK             : branding.primary + 'dd';
  const barTo       = isSuperAdmin ? NX_BG               : branding.primary;
  const notifRead   = isSuperAdmin ? 'bg-blue-50/40'     : 'bg-primary/5';
  const markColor   = isSuperAdmin ? NX_BG               : branding.primary;

  // ── Identite entreprise ──────────────────────────────────────
  const brandName   = isSuperAdmin ? 'Nexora'            : getCompanyDisplayName(company);
  const brandInit   = isSuperAdmin ? 'N'                 : getCompanyInitial(company);
  const brandLogo   = isSuperAdmin ? null                : (company as any)?.logo_url as string | null;
  const moduleLabel = getModuleLabel(pathname);

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (nRef.current && !nRef.current.contains(e.target as Node)) setShowN(false);
      if (uRef.current && !uRef.current.contains(e.target as Node)) setShowU(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    createClient().from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => {
        if (data) { setNotifs(data as Notif[]); setUnread(data.filter(n => !n.is_read).length); }
      });
  }, [user?.id]);

  const toggleDark = () => { document.documentElement.classList.toggle('dark'); setDark(d => !d); };
  const markRead   = async () => {
    if (!user?.id) return;
    await createClient().from('notifications').update({ is_read: true } as never).eq('user_id', user.id);
    setNotifs(n => n.map(x => ({ ...x, is_read: true }))); setUnread(0);
  };
  const logout = async () => {
    await createClient().auth.signOut(); reset(); router.push('/auth/login');
  };

  const initials    = getInitials(user?.full_name || user?.email || '?');
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Utilisateur';

  return (
    <>
      <header
        className="h-14 md:h-16 flex items-center px-3 md:px-5 gap-2 md:gap-3 flex-shrink-0"
        style={{
          background: `linear-gradient(90deg, ${barFrom} 0%, ${barTo} 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Burger mobile */}
        <button onClick={() => setDrawerOpen(true)} className="md:hidden p-2 rounded-xl transition-colors"
          style={{ color: 'rgba(255,255,255,0.70)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Menu size={20}/>
        </button>

        {/* Logo mobile */}
        <div className="flex items-center gap-2 md:hidden">
          {brandLogo
            ? <img src={brandLogo} alt={brandName} className="w-7 h-7 rounded-lg object-cover"/>
            : <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0"
                style={{ background: accent, color: accentText }}>{brandInit}</div>
          }
          <span className="font-bold text-white text-sm truncate max-w-[140px]">{brandName}</span>
        </div>

        {/* Fil d'Ariane desktop */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {brandLogo
              ? <img src={brandLogo} alt={brandName} className="w-5 h-5 rounded object-cover flex-shrink-0"/>
              : <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: accent, color: accentText }}>{brandInit}</div>
            }
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>{brandName}</span>
            {moduleLabel && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
                <span className="text-xs font-bold text-white">{moduleLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1"/>

        <div className="flex items-center gap-0.5 md:gap-1">

          {/* Dark mode */}
          <button onClick={toggleDark} className="p-2 rounded-xl transition-colors"
            style={{ color: 'rgba(255,255,255,0.60)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}>
            {dark ? <Sun size={17}/> : <Moon size={17}/>}
          </button>

          {/* Notifications */}
          <div className="relative" ref={nRef}>
            <button onClick={() => setShowN(v => !v)} className="relative p-2 rounded-xl transition-colors"
              style={{ color: 'rgba(255,255,255,0.60)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}>
              <Bell size={17}/>
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-black rounded-full flex items-center justify-center"
                  style={{ background: accent, color: accentText }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showN && (
                <motion.div initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}}
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-80 max-w-sm bg-white dark:bg-slate-800 border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h4 className="font-bold text-sm text-foreground">Notifications</h4>
                    {unread > 0 && (
                      <button onClick={markRead} className="text-xs font-semibold hover:underline" style={{ color: markColor }}>
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifs.length === 0
                      ? <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
                      : notifs.map(n => (
                        <div key={n.id} className={'px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors' + (!n.is_read ? ` ${notifRead}` : '')}>
                          <p className="text-xs font-semibold text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{formatDateRelative(n.created_at)}</p>
                        </div>
                      ))
                    }
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative ml-1" ref={uRef}>
            <button onClick={() => setShowU(v => !v)}
              className="flex items-center gap-2 pl-2 pr-2 md:pr-3 py-1.5 rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.10)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0"
                style={{ background: accent, color: accentText }}>
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-none">{displayName}</p>
                <p className="text-[10px] capitalize mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {user?.role?.replace(/_/g, ' ') || 'admin'}
                </p>
              </div>
              <ChevronDown size={13} className="hidden sm:block" style={{ color: 'rgba(255,255,255,0.50)' }}/>
            </button>

            <AnimatePresence>
              {showU && (
                <motion.div initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}}
                  className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border"
                    style={{ background: barTo + '12' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{ background: accent, color: accentText }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{user?.full_name || displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <div className="mt-2 px-2 py-1 rounded-lg text-center text-[10px] font-bold tracking-wide"
                        style={{ background: `${NX_BG}20`, color: NX_BG }}>
                        SUPER ADMIN — NEXORA
                      </div>
                    )}
                  </div>
                  <div className="p-1.5">
                    <Link href="/admin/settings" onClick={() => setShowU(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                      <Settings size={14} className="text-muted-foreground"/> Parametres
                    </Link>
                    <button onClick={logout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition-colors"
                      style={{ color: '#ef4444' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <LogOut size={14}/> Deconnexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}/>
    </>
  );
}
