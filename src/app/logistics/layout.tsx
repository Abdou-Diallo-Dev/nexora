'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, setCompany, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) return;
    const sb = createClient();
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/auth/login'); return; }
      sb.from('users')
        .select('*, companies(*)')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setUser(data as any);
            setCompany((data.companies || null) as any);
          } else {
            router.replace('/auth/login');
          }
          setLoading(false);
        });
    }).catch(() => router.replace('/auth/login'));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
