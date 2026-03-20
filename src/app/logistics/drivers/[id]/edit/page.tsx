'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

export default function EditDriverPage() {
  const { company } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    first_name:'', last_name:'', phone:'', email:'',
    license_number:'', license_expiry:'',
    id_card_number:'', id_card_expiry:'',
    status:'available', notes:'',
  });
  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!id) return;
    createClient().from('drivers').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) setForm({
          first_name: data.first_name||'', last_name: data.last_name||'',
          phone: data.phone||'', email: data.email||'',
          license_number: data.license_number||'',
          license_expiry: data.license_expiry||'',
          id_card_number: data.id_card_number||'',
          id_card_expiry: data.id_card_expiry||'',
          status: data.status||'available',
          notes: data.notes||'',
        });
        setLoading(false);
      });
  }, [id]);

  const save = async () => {
    if (!form.first_name || !form.phone) { toast.error('Prénom et téléphone requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('drivers').update({
      first_name: form.first_name, last_name: form.last_name,
      phone: form.phone, email: form.email||null,
      license_number: form.license_number||null,
      license_expiry: form.license_expiry||null,
      id_card_number: form.id_card_number||null,
      id_card_expiry: form.id_card_expiry||null,
      status: form.status, notes: form.notes||null,
    }).eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Chauffeur mis à jour ✓');
    router.push('/logistics/drivers');
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/drivers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors"><ArrowLeft size={18}/></Link>
        <PageHeader title="Modifier le chauffeur" subtitle={`${form.first_name} ${form.last_name}`}/>
      </div>
      <div className="max-w-2xl">
        <div className={cardCls+' p-6 space-y-5'}>
          {/* Infos personnelles */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><User size={15} className="text-primary"/>Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Prénom *</label><input value={form.first_name} onChange={e=>set('first_name',e.target.value)} className={inputCls}/></div>
              <div><label className={labelCls}>Nom *</label><input value={form.last_name} onChange={e=>set('last_name',e.target.value)} className={inputCls}/></div>
              <div><label className={labelCls}>Téléphone *</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+221 77 000 00 00" className={inputCls}/></div>
              <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={inputCls}/></div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">📄 Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>N° Permis</label><input value={form.license_number} onChange={e=>set('license_number',e.target.value)} className={inputCls}/></div>
              <div><label className={labelCls}>Expiration permis</label><input type="date" value={form.license_expiry} onChange={e=>set('license_expiry',e.target.value)} className={inputCls}/></div>
              <div><label className={labelCls}>N° CNI</label><input value={form.id_card_number} onChange={e=>set('id_card_number',e.target.value)} className={inputCls}/></div>
              <div><label className={labelCls}>Expiration CNI</label><input type="date" value={form.id_card_expiry} onChange={e=>set('id_card_expiry',e.target.value)} className={inputCls}/></div>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className={labelCls}>Statut</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} className={selectCls+' w-full'}>
              <option value="available">✅ Disponible</option>
              <option value="on_mission">🚛 En mission</option>
              <option value="off">⏸️ Hors service</option>
              <option value="inactive">❌ Inactif</option>
            </select>
          </div>

          {/* Notes */}
          <div><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} className={inputCls+' resize-none w-full'}/></div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className={btnPrimary+' flex-1 justify-center'}>
              {saving?<LoadingSpinner size={15}/>:<User size={15}/>}{saving?'Enregistrement...':'Enregistrer'}
            </button>
            <Link href="/logistics/drivers" className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}