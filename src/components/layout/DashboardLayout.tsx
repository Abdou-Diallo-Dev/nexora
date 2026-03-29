'use client';
import Sidebar from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/lib/store';
import { usePathname } from 'next/navigation';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const isSuperAdmin = user?.role === 'super_admin' || pathname.startsWith('/super-admin');

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      style={isSuperAdmin ? {
        ['--primary' as any]:            '224 71% 40%',
        ['--primary-foreground' as any]: '0 0% 100%',
      } : undefined}
    >
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar/>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto pb-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
