'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, inputCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

export default function FormPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    toast.info('Module en cours de développement');
    setLoading(false);
    router.push('/logistics/drivers');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/drivers" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Nouveau chauffeur" />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6 max-w-lg'}>
        <div className="space-y-4">
          <div><label className={labelCls}>Nom *</label><input value={name} onChange={e => setName(e.target.value)} required className={inputCls} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Link href="/logistics/drivers" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}><Save size={16} />Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
