'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

const CATEGORIES = [
  'Prestataire', 'Notaire', 'Banque / Financier', 'Syndic', 'Agence immobiliere',
  'Assurance', 'Artisan / Technicien', 'Administration', 'Autre',
];

const EMPTY = {
  type: 'external', category: '', first_name: '', last_name: '',
  company_name: '', email: '', phone: '', phone2: '', address: '', notes: '',
};

export default function ContactFormPage() {
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
    createClient().from('re_contacts').select('*').eq('id', rawId).maybeSingle().then(({ data }) => {
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
    const payload = { ...form, company_id: company.id };
    const sb = createClient();
    const { error } = isEdit
      ? await sb.from('re_contacts').update(payload as never).eq('id', rawId!)
      : await sb.from('re_contacts').insert(payload as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? 'Contact modifie' : 'Contact ajoute');
    router.push('/real-estate/annuaire');
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/annuaire" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title={isEdit ? 'Modifier contact' : 'Nouveau contact'} />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Type & Categorie */}
          <div>
            <label className={labelCls}>Type de contact</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className={selectCls}>
              <option value="internal">Interne</option>
              <option value="external">Externe</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Categorie</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={selectCls}>
              <option value="">— Choisir —</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Identite */}
          <div>
            <label className={labelCls}>Prenom</label>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Prenom" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nom</label>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Nom" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Societe / Organisation</label>
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Ex: Cabinet Notarial Alpha" className={inputCls} />
          </div>

          {/* Coordonnees */}
          <div>
            <label className={labelCls}>Telephone principal</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telephone secondaire</label>
            <input value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder="+221 33 000 00 00" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@exemple.com" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Adresse</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Adresse complete" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Informations complementaires..." className={inputCls as string} />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/annuaire" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? <LoadingSpinner size={16} /> : <Save size={16} />}
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}
