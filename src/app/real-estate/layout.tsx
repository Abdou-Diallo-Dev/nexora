'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/ui';
import { useAuthStore } from '@/lib/store';
import { EXECUTIVE_ALLOWED_ROUTES, isExecutiveRole, isLogisticsRole, isBetonRole } from '@/lib/permissions';

export default function RELayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user?.role) return;
    // Rôles logistique → redirigés vers leur module
    if (isLogisticsRole(user.role)) { router.replace('/logistics'); return; }
    // Rôles béton → redirigés vers leur module
    if (isBetonRole(user.role)) { router.replace('/beton'); return; }
    // Rôles exécutifs → pages limitées uniquement
    if (!isExecutiveRole(user.role)) return;
    if (!EXECUTIVE_ALLOWED_ROUTES.includes(pathname)) {
      router.replace('/real-estate');
    }
  }, [pathname, router, user?.role]);

  if (user?.role && isExecutiveRole(user.role) && !EXECUTIVE_ALLOWED_ROUTES.includes(pathname)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
