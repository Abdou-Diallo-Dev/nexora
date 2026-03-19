'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewLogisticsClientPage() {
  const { company, user } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', email:'', type:'particulier', address:'', city:'', notes:'' });
  const set = (k:string,v:string) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('logistics_clients').insert({
      company_id: company!.id, ...form,
      phone: form.phone||null, email: form.email||null,
      address: form.address||null, city: form.city||null,
      notes: form.notes||null, created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Client ajouté !');
    router.push('/logistics/clients');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/clients" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <PageHeader title="Nouveau client" subtitle="Ajouter un client logistique"/>
      </div>
      <div className="max-w-2xl">
        <div className={cardCls+' p-6 space-y-4'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className={labelCls}>Nom / Raison sociale *</label><input value={form.name} onChange={e=>set('name',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Téléphone</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+221 77 000 00 00" className={inputCls}/></div>
            <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={inputCls}/></div>
            <div><label className={labelCls}>Type de client</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)} className={selectCls+' w-full'}>
                <option value="particulier">Particulier</option>
                <option value="entreprise">Entreprise</option>
                <option value="btp">BTP</option>
                <option value="commerce">Commerce</option>
                <option value="industrie">Industrie</option>
              </select>
            </div>
            <div><label className={labelCls}>Ville</label><input value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Ex: Dakar" className={inputCls}/></div>
            <div className="sm:col-span-2"><label className={labelCls}>Adresse</label><input value={form.address} onChange={e=>set('address',e.target.value)} className={inputCls}/></div>
            <div className="sm:col-span-2"><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3} className={inputCls+' resize-none w-full'}/></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className={btnPrimary+' flex-1 justify-center'}>
              {saving?<LoadingSpinner size={15}/>:<User size={15}/>}{saving?'Enregistrement...':'Ajouter le client'}
            </button>
            <Link href="/logistics/clients" className={btnSecondary}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}