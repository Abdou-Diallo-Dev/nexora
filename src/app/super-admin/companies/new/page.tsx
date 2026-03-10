'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

export default function NewCompanyPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', plan: 'starter' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  if (user?.role !== 'super_admin') return <div className="text-center py-16 text-muted-foreground">Accès refusé</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await createClient().from('companies').insert({ ...form, is_active: true, modules: ['real_estate', 'logistics'] } as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Entreprise créée');
    router.push('/super-admin/companies');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/super-admin/companies" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Nouvelle entreprise" />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6 max-w-lg'}>
        <div className="space-y-4">
          <div><label className={labelCls}>Nom *</label><input value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Téléphone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Adresse</label><input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Plan</label>
            <select value={form.plan} onChange={e => set('plan', e.target.value)} className={selectCls}>
              {[['starter', 'Starter'], ['pro', 'Pro'], ['enterprise', 'Enterprise']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Link href="/super-admin/companies" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>{loading ? <LoadingSpinner size={16} /> : <Save size={16} />}Créer</button>
        </div>
      </form>
    </div>
  );
}
