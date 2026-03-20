'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';

export default function DriverRoot() {
  const router = useRouter();
  useEffect(() => {
    const check = async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.replace('/driver/login'); return; }
      // Check if user is a driver
      const { data: driver } = await sb.from('drivers')
        .select('id').eq('user_id', session.user.id).maybeSingle();
      if (driver) { router.replace('/driver/missions'); }
      else { router.replace('/driver/login'); }
    };
    check();
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="text-4xl mb-4">🚛</div>
        <p className="text-white/60 text-sm">Chargement...</p>
        <LoadingSpinner size={24}/>
      </div>
    </div>
  );
}