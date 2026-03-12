'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Zap, Home, CreditCard, Wrench, MessageSquare, LogOut, Bell, User, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';

type Notif = { id: string; type: string; title: string; body: string | null; is_read: boolean; link: string | null; created_at: string };

const NAV = [
  { href: '/tenant-portal/dashboard',      label: 'Accueil',    icon: <Home size={18} /> },
  { href: '/tenant-portal/payments',        label: 'Paiements',  icon: <CreditCard size={18} /> },
  { href: '/tenant-portal/contract',        label: 'Contrat',    icon: <FileText size={18} /> },
  { href: '/tenant-portal/tickets',         label: 'Problèmes',  icon: <Wrench size={18} /> },
  { href: '/tenant-portal/messages',        label: 'Messages',   icon: <MessageSquare size={18} /> },
];

const NOTIF_ICONS: Record<string, string> = {
  new_message:    '💬',
  ticket_update:  '🔧',
  rent_reminder:  '📅',
  info:           'ℹ️',
};

export default function TenantPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsg, setUnreadMsg]     = useState(0);

  useEffect(() => {
    if (user && user.role !== 'tenant') router.push('/real-estate');
  }, [user]);

  // Load notifications
  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();

    const loadNotifs = async () => {
      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      const list = (data || []) as Notif[];
      setNotifs(list);
      setUnreadCount(list.filter(n => !n.is_read).length);
    };

    const loadUnreadMsg = async () => {
      const { data: ta } = await sb.from('tenant_accounts').select('tenant_id').eq('user_id', user.id).maybeSingle();
      if (!ta) return;
      const { count } = await sb.from('messages').select('id', { count: 'exact', head: true })
        .eq('tenant_id', ta.tenant_id).eq('sender_role', 'company').eq('is_read', false);
      setUnreadMsg(count || 0);
    };

    loadNotifs();
    loadUnreadMsg();

    // Realtime notifications
    const channel = sb.channel('tenant-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifs(prev => [payload.new as Notif, ...prev]);
          setUnreadCount(c => c + 1);
        })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    await createClient().from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const logout = async () => {
    await createClient().auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top nav */}
      <header className="bg-white dark:bg-slate-800 border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-sm text-foreground">
              Nexora <span className="text-primary">Locataire</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(v => !v)}
                className="relative p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notif dropdown */}
              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="font-semibold text-sm text-foreground">Notifications</p>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-primary hover:underline">Tout lire</button>
                      )}
                      <button onClick={() => setShowNotifs(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
                    ) : notifs.map(n => (
                      <div
                        key={n.id}
                        onClick={async () => {
                          await createClient().from('notifications').update({ is_read: true }).eq('id', n.id);
                          setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                          setUnreadCount(c => Math.max(0, c - (n.is_read ? 0 : 1)));
                          if (n.link) { setShowNotifs(false); router.push(n.link); }
                        }}
                        className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                        <span className="text-lg flex-shrink-0 mt-0.5">{NOTIF_ICONS[n.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                            {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                          </div>
                          {n.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={logout} className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Déconnexion">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-border z-40">
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const isMsgTab = item.href.includes('messages');
            return (
              <Link key={item.href} href={item.href}
                className={'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors relative ' + (active ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                <span className={active ? 'text-primary' : ''}>{item.icon}</span>
                {isMsgTab && unreadMsg > 0 && (
                  <span className="absolute top-2 right-[calc(50%-14px)] w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadMsg > 9 ? '9+' : unreadMsg}
                  </span>
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}