'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewDriverPage() {
  const { company, user } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name:'', last_name:'', phone:'', email:'',
    license_number:'', license_expiry:'',
    id_card_number:'', id_card_expiry:'',
    status:'available', notes:'',
  });
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if (!form.first_name || !form.phone) { toast.error('Prénom et téléphone requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('drivers').insert({
      company_id: company!.id,
      ...form,
      license_expiry: form.license_expiry||null,
      id_card_expiry: form.id_card_expiry||null,
      // created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Chauffeur ajouté !');
    router.push('/logistics/drivers');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/drivers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors"><ArrowLeft size={18}/></Link>
        <PageHeader title="Nouveau chauffeur" subtitle="Ajouter un chauffeur à votre flotte"/>
      </div>
      <div className="max-w-2xl">
        <div className={cardCls+' p-6 space-y-4'}>
          <div className="flex items-center gap-2 mb-2"><User size={16} className="text-primary"/><h3 className="font-semibold">Informations personnelles</h3></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Prénom *</label><input value={form.first_name} onChange={e=>set('first_name',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Nom *</label><input value={form.last_name} onChange={e=>set('last_name',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Téléphone *</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+221 77 000 00 00" className={inputCls}/></div>
            <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>N° Permis</label><input value={form.license_number} onChange={e=>set('license_number',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Expiration permis</label><input type="date" value={form.license_expiry} onChange={e=>set('license_expiry',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>N° CNI</label><input value={form.id_card_number} onChange={e=>set('id_card_number',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Expiration CNI</label><input type="date" value={form.id_card_expiry} onChange={e=>set('id_card_expiry',e.target.value)} className={inputCls}/></div>
          </div>
          <div><label className={labelCls}>Statut</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} className={selectCls+' w-full'}>
              <option value="available">Disponible</option>
              <option value="off">Hors service</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
          <div><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} className={inputCls+' resize-none w-full'}/></div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className={btnPrimary+' flex-1 justify-center'}>
              {saving?<LoadingSpinner size={15}/>:<User size={15}/>}{saving?'Enregistrement...':'Ajouter le chauffeur'}
            </button>
            <Link href="/logistics/drivers" className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}