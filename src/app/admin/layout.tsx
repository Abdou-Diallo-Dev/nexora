'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/ui';
import { isExecutiveRole } from '@/lib/permissions';
import { useAuthStore } from '@/lib/store';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role && isExecutiveRole(user.role)) {
      router.replace('/real-estate');
    }
  }, [router, user?.role]);

  if (user?.role && isExecutiveRole(user.role)) {
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
