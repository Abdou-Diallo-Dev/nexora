'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

type Status = 'checking' | 'ready' | 'no-company';

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
  const { user, company, setUser, setCompany, setLoading } = useAuthStore();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    // Si user ET company déjà dans le store → on est prêt
    if (user && company) {
      setStatus('ready');
      setLoading(false);
      return;
    }

    const sb = createClient();
    (async () => {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { router.replace('/auth/login'); return; }

        const { data } = await sb
          .from('users')
          .select('*, companies(*)')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!data) { router.replace('/auth/login'); return; }

        setUser(data as any);
        setCompany((data.companies || null) as any);

        // Si l'utilisateur n'a pas de company_id → vraiment pas de société
        if (!data.company_id) {
          setStatus('no-company');
        } else {
          setStatus('ready');
        }
      } catch {
        router.replace('/auth/login');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (status === 'no-company') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-lg font-bold text-foreground mb-2">Compte non configuré</p>
          <p className="text-sm text-muted-foreground">
            Votre compte n'est pas associé à une entreprise. Contactez l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  // Utilisateur authentifié mais company toujours null (RLS ou données manquantes)
  if (!company) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <p className="font-bold text-foreground">Données entreprise indisponibles</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Impossible de charger les données de votre entreprise. Vérifiez que votre compte est bien configuré ou contactez l&apos;administrateur.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
