'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '',
  employee_type: 'administration', post: '', department: '',
  salary: '', hire_date: '', end_date: '', status: 'active', notes: '',
};

export default function EmployeeFormPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const rawId = (params as any)?.id as string | undefined;
  const isEdit = !!rawId && rawId !== 'new';
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isEdit || !rawId) return;
    createClient().from('re_employees').select('*').eq('id', rawId).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as Record<string, unknown>;
        setForm(Object.fromEntries(Object.keys(EMPTY).map(k => [k, d[k]?.toString() ?? ''])) as typeof EMPTY);
      }
      setFetching(false);
    });
  }, [isEdit, rawId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setLoading(true);
    const payload = {
      ...form,
      salary: form.salary ? Number(form.salary) : null,
      hire_date: form.hire_date || null,
      end_date: form.end_date || null,
      company_id: company.id,
    };
    const sb = createClient();
    const { error } = isEdit
      ? await sb.from('re_employees').update(payload as never).eq('id', rawId!)
      : await sb.from('re_employees').insert(payload as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Employe modifie' : 'Employe ajoute');
    router.push('/real-estate/employes');
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/employes" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title={isEdit ? 'Modifier employe' : 'Nouvel employe'} />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className={labelCls}>Prenom *</label>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required placeholder="Prenom" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nom *</label>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} required placeholder="Nom" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telephone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemple.com" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Type d emploi *</label>
            <select value={form.employee_type} onChange={e => set('employee_type', e.target.value)} className={selectCls}>
              <option value="administration">Administration</option>
              <option value="femme_menagere">Femme de menage</option>
              <option value="gardien">Gardien / Agent de securite</option>
              <option value="technicien">Technicien / Ouvrier</option>
              <option value="comptable">Comptable</option>
              <option value="chauffeur">Chauffeur</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
              <option value="active">Actif</option>
              <option value="conge">En conge</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Poste / Fonction</label>
            <input value={form.post} onChange={e => set('post', e.target.value)} placeholder="Ex: Responsable accueil" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Departement / Immeuble</label>
            <input value={form.department} onChange={e => set('department', e.target.value)} placeholder="Ex: Immeuble Les Palmiers" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Salaire mensuel (FCFA)</label>
            <input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="150000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date d embauche</label>
            <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date de fin (optionnel)</label>
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Informations complementaires..." className={inputCls as string} />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/employes" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? <LoadingSpinner size={16} /> : <Save size={16} />}
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}
