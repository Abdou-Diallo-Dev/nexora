'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

export default function NewClientPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setLoading(true);
    const { error } = await createClient().from('clients').insert({ ...form, company_id: company.id } as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Client créé');
    router.push('/logistics/clients');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/clients" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Nouveau client" />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className={labelCls}>Nom / Raison sociale *</label><input value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Téléphone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Adresse</label><input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Ville</label><input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} /></div>
          <div className="md:col-span-2"><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Link href="/logistics/clients" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>{loading ? <LoadingSpinner size={16} /> : <Save size={16} />}Créer</button>
        </div>
      </form>
    </div>
  );
}
