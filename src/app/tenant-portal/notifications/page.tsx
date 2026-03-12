'use client';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Notif = { id: string; type: string; title: string; body: string | null; is_read: boolean; link: string | null; created_at: string };

const ICONS: Record<string, string> = {
  new_message:   '💬',
  ticket_update: '🔧',
  rent_reminder: '📅',
  info:          'ℹ️',
};

const COLORS: Record<string, string> = {
  new_message:   'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800',
  ticket_update: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
  rent_reminder: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
  info:          'bg-slate-50 dark:bg-slate-800 border-border',
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router   = useRouter();
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    const { data } = await createClient()
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifs((data || []) as Notif[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const markAllRead = async () => {
    await createClient().from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteAll = async () => {
    await createClient().from('notifications').delete().eq('user_id', user!.id);
    setNotifs([]);
  };

  const handleClick = async (n: Notif) => {
    if (!n.is_read) {
      await createClient().from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.link) router.push(n.link);
  };

  const unread = notifs.filter(n => !n.is_read).length;

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
            <Bell size={20} className="text-yellow-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground">{unread > 0 ? `${unread} non lue(s)` : 'Tout est à jour'}</p>
          </div>
        </div>
        {notifs.length > 0 && (
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors">
                <CheckCheck size={13} /> Tout lire
              </button>
            )}
            <button onClick={deleteAll} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-foreground mb-1">Aucune notification</p>
          <p className="text-sm">Vous êtes à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex gap-3 p-4 rounded-2xl border cursor-pointer transition-colors hover:opacity-90 ${COLORS[n.type] || COLORS.info} ${!n.is_read ? 'shadow-sm' : 'opacity-75'}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{ICONS[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground text-sm">{n.title}</p>
                  {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
                {n.body && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1.5">{formatDate(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}