'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

const EMPTY = { first_name:'', last_name:'', email:'', phone:'', nationality:'', birth_date:'', notes:'', status:'active' };

export default function TenantFormPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const rawId = params?.id;
  const isEdit = !!rawId && rawId !== 'new';
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isEdit || !rawId) return;
    createClient().from('tenants').select('*').eq('id', rawId).maybeSingle().then(({ data }) => {
      if (data) setForm({ first_name:data.first_name||'', last_name:data.last_name||'', email:data.email||'', phone:data.phone||'', nationality:data.nationality||'', birth_date:data.birth_date||'', notes:data.notes||'', status:data.status||'active' });
      setFetching(false);
    });
  }, [isEdit, rawId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id && !isEdit) return;
    setLoading(true);
    const sb = createClient();
    const payload = { ...form, birth_date: form.birth_date||null };
    const { error } = isEdit
      ? await sb.from('tenants').update(payload as never).eq('id', rawId!)
      : await sb.from('tenants').insert({ ...payload, company_id: company!.id } as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-');
    toast.success(isEdit ? 'Locataire modifié' : 'Locataire créé');
    router.push(isEdit ? '/real-estate/tenants/'+rawId : '/real-estate/tenants');
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/tenants" className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link>
        <PageHeader title={isEdit?'Modifier le locataire':'Nouveau locataire'} />
      </div>
      <form onSubmit={submit} className={cardCls+' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Prénom *</label><input value={form.first_name} onChange={e=>set('first_name',e.target.value)} required className={inputCls}/></div>
          <div><label className={labelCls}>Nom *</label><input value={form.last_name} onChange={e=>set('last_name',e.target.value)} required className={inputCls}/></div>
          <div><label className={labelCls}>Email *</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} required className={inputCls}/></div>
          <div><label className={labelCls}>Téléphone</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+221 77 000 00 00" className={inputCls}/></div>
          <div><label className={labelCls}>Nationalité</label><input value={form.nationality} onChange={e=>set('nationality',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Date de naissance</label><input type="date" value={form.birth_date} onChange={e=>set('birth_date',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Statut</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} className={selectCls}>
              <option value="active">Actif</option><option value="inactive">Inactif</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} className={inputCls}/></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/tenants" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>{loading?<LoadingSpinner size={16}/>:<Save size={16}/>}{isEdit?'Enregistrer':'Créer'}</button>
        </div>
      </form>
    </div>
  );
}
