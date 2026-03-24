'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, Sun, Moon, LogOut, Settings, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getBrandingColors, getCompanyDisplayName, getCompanyInitial } from '@/lib/branding';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { formatDateRelative, getInitials } from '@/lib/utils';
import Link from 'next/link';
import { MobileDrawer } from './Sidebar';

type Notif = {
  id: string; title: string; message: string;
  type: string; is_read: boolean; created_at: string;
};

export function Topbar() {
  const { user, company, reset } = useAuthStore();
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [unread, setUnread]   = useState(0);
  const [showN, setShowN]     = useState(false);
  const [showU, setShowU]     = useState(false);
  const [dark, setDark]       = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const nRef = useRef<HTMLDivElement>(null);
  const uRef = useRef<HTMLDivElement>(null);

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

  const markRead = async () => {
    if (!user?.id) return;
    await createClient().from('notifications').update({ is_read: true } as never).eq('user_id', user.id);
    setNotifs(n => n.map(x => ({ ...x, is_read: true }))); setUnread(0);
  };

  const logout = async () => {
    await createClient().auth.signOut();
    reset();
    router.push('/auth/login');
  };

  const initials = getInitials(user?.full_name || user?.email || '?');
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Utilisateur';
  const companyName = user?.role === 'super_admin' ? 'Nexora' : getCompanyDisplayName(company);
  const companyInitial = user?.role === 'super_admin' ? 'N' : getCompanyInitial(company);
  const colors = getBrandingColors(company);

  return (
    <>
      <header className="h-14 md:h-16 bg-white dark:bg-slate-800 border-b border-border flex items-center px-3 md:px-4 gap-2 md:gap-3 flex-shrink-0">

        {/* Burger mobile */}
        <button onClick={() => setDrawerOpen(true)}
          className="md:hidden p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Menu size={20}/>
        </button>

        {/* Logo mobile uniquement */}
        <div className="flex items-center gap-2 md:hidden">
          {company?.logo_url && user?.role !== 'super_admin' ? (
            <img src={company.logo_url} alt={companyName} className="w-7 h-7 rounded-lg object-cover bg-primary/10 p-1 flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs" style={{ backgroundColor: colors.primary, color: colors.primaryText }}>
              {companyInitial}
            </div>
          )}
          <span className="font-bold text-foreground text-sm truncate max-w-[130px]">{companyName}</span>
        </div>

        <div className="flex-1"/>

        <div className="flex items-center gap-0.5 md:gap-1">
          {/* Dark mode */}
          <button onClick={toggleDark}
            className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            {dark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>

          {/* Notifications */}
          <div className="relative" ref={nRef}>
            <button onClick={() => setShowN(v => !v)}
              className="relative p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Bell size={18}/>
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {showN && (
                <motion.div
                  initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}}
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-80 max-w-sm bg-white dark:bg-slate-800 border border-border rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
                    {unread > 0 && <button onClick={markRead} className="text-xs text-primary hover:underline">Tout marquer lu</button>}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
                    ) : notifs.map(n => (
                      <div key={n.id} className={'px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors'+(!n.is_read?' bg-blue-50/50 dark:bg-blue-900/10':'')}>
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatDateRelative(n.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div className="relative ml-1" ref={uRef}>
            <button onClick={() => setShowU(v => !v)}
              className="flex items-center gap-2 pl-1.5 md:pl-2 pr-2 md:pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-none">{displayName}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.role || 'admin'}</p>
              </div>
            </button>
            <AnimatePresence>
              {showU && (
                <motion.div
                  initial={{opacity:0,y:8,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}}
                  className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-border rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.full_name || displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <Link href="/admin/settings" onClick={() => setShowU(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                      <Settings size={15} className="text-muted-foreground"/> Parametres
                    </Link>
                    <button onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                      <LogOut size={15}/> Deconnexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}/>
    </>
  );
}
