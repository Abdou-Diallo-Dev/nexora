'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

function getRedirectPath(role: string, modules: string[]): string {
  switch (role) {
    case 'super_admin': return '/super-admin/dashboard';
    case 'tenant':      return '/tenant-portal/dashboard';
    case 'comptable':
      if (modules?.includes('real_estate')) return '/real-estate/reports';
      if (modules?.includes('logistics'))   return '/logistics';
      return '/real-estate/reports';
    default:
      if (modules?.includes('real_estate')) return '/real-estate';
      if (modules?.includes('logistics'))   return '/logistics';
      return '/real-estate';
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, setCompany, setLoading } = useAuthStore();
  const [checking, setChecking] = useState(!user);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setChecking(false);
      return;
    }
    const sb = createClient();
    const run = async () => {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.user) {
          router.push('/auth/login');
          return;
        }
        const { data } = await sb.from('users').select('*, companies(*)').eq('id', session.user.id).maybeSingle();
        if (data) {
          setUser(data as never);
          setCompany((data.companies || null) as never);
          // Redirect based on role — don't stay on /dashboard
          const modules = (data.companies as any)?.modules || [];
          router.replace(getRedirectPath(data.role, modules));
        } else {
          router.push('/auth/login');
        }
      } catch {
        router.push('/auth/login');
      } finally {
        setChecking(false);
        setLoading(false);
      }
    };
    run();
    const { data: { subscription } } = sb.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_OUT') {
        setCompany(null);
        setUser(null);
        router.push('/auth/login');
      }
    });
    return () => subscription.unsubscribe();
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size={36} />
      </div>
    );
  }
  if (!user) return null;
  return <DashboardLayout>{children}</DashboardLayout>;
}
