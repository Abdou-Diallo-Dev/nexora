'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/ui';

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
