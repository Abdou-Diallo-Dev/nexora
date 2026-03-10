'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Zap, Home, CreditCard, Wrench, MessageSquare, LogOut, Bell, User } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';

const NAV = [
  { href:'/tenant-portal/dashboard', label:'Accueil',    icon:<Home size={18}/> },
  { href:'/tenant-portal/payments',  label:'Paiements',  icon:<CreditCard size={18}/> },
  { href:'/tenant-portal/tickets',   label:'Problemes',  icon:<Wrench size={18}/> },
  { href:'/tenant-portal/messages',  label:'Messagerie', icon:<MessageSquare size={18}/> },
  { href:'/tenant-portal/profile',   label:'Profil',     icon:<User size={18}/> },
];

export default function TenantPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user && user.role !== 'tenant') router.push('/real-estate');
  }, [user]);

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
              <Zap size={13} className="text-white"/>
            </div>
            <span className="font-bold text-sm text-foreground">
              Nexora <span className="text-primary">Locataire</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
              <Bell size={17}/>
            </button>
            <button onClick={logout} className="p-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700" title="Deconnexion">
              <LogOut size={17}/>
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
            const active = pathname===item.href || pathname.startsWith(item.href+'/');
            return (
              <Link key={item.href} href={item.href}
                className={'flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors '+(active?'text-primary':'text-muted-foreground hover:text-foreground')}>
                <span className={active?'text-primary':''}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}