'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
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
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [createAccount, setCreateAccount] = useState(true);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isEdit || !rawId) return;
    createClient().from('tenants').select('*').eq('id', rawId).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({ first_name:data.first_name||'', last_name:data.last_name||'', email:data.email||'', phone:data.phone||'', nationality:data.nationality||'', birth_date:data.birth_date||'', notes:data.notes||'', status:data.status||'active' });
        setAvatarUrl(data.avatar_url||null);
      }
      setFetching(false);
    });
  }, [isEdit, rawId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id && !isEdit) return;
    setLoading(true);
    const sb = createClient();
    const payload = { ...form, birth_date: form.birth_date||null, avatar_url: avatarUrl };

    if (isEdit) {
      const { error } = await sb.from('tenants').update(payload as never).eq('id', rawId!);
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      qc.bust('re-');
      toast.success('Locataire modifié');
      router.push('/real-estate/tenants/' + rawId);
      return;
    }

    // Créer le locataire
    const { data: tenant, error } = await sb
      .from('tenants')
      .insert({ ...payload, company_id: company!.id } as never)
      .select('id')
      .single();

    if (error || !tenant) { toast.error(error?.message || 'Erreur création'); setLoading(false); return; }

    // Créer automatiquement le compte locataire si email fourni
    if (createAccount && form.email) {
      const res = await fetch('/api/admin/create-tenant-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id:  tenant.id,
          email:      form.email,
          first_name: form.first_name,
          last_name:  form.last_name,
          company_id: company!.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.temp_password) {
          // Pas de Resend configuré — afficher le mot de passe temporaire
          toast.success(`Compte créé ! Mot de passe temporaire : ${json.temp_password}`, { duration: 15000 });
        } else if (!json.already_exists) {
          toast.success('Compte locataire créé — identifiants envoyés par email');
        } else {
          toast.success('Locataire créé');
        }
      } else {
        toast.warning('Locataire créé mais erreur compte : ' + json.error);
      }
    } else {
      toast.success('Locataire créé');
    }

    qc.bust('re-');
    router.push('/real-estate/tenants');
    setLoading(false);
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/tenants" className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link>
        <PageHeader title={isEdit ? 'Modifier le locataire' : 'Nouveau locataire'} />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className={cardCls+' p-6'}>
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
        </div>

        {/* Option compte locataire */}
        {!isEdit && form.email && (
          <div className={cardCls+' p-4'}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserPlus size={18} className="text-blue-600"/>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Créer un espace locataire</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Le locataire recevra ses identifiants par email pour accéder à son espace personnel</p>
                  </div>
                  <button type="button" onClick={() => setCreateAccount(v => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${createAccount ? 'bg-primary' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${createAccount ? 'translate-x-5' : ''}`}/>
                  </button>
                </div>
                {createAccount && (
                  <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
                    ✓ Accès à ses quittances et contrat PDF<br/>
                    ✓ Suivi de ses paiements<br/>
                    ✓ Messagerie avec l'équipe<br/>
                    ✓ Signalement de tickets de maintenance
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/real-estate/tenants" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? <LoadingSpinner size={16}/> : <Save size={16}/>}
            {isEdit ? 'Enregistrer' : 'Créer le locataire'}
          </button>
        </div>
      </form>
    </div>
  );
}