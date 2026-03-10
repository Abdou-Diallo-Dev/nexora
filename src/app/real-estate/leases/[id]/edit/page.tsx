'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

export default function EditLeasePage() {
  const{id}=useParams<{id:string}>();
  const router=useRouter();
  const[form,setForm]=useState({start_date:'',end_date:'',rent_amount:'',charges_amount:'0',deposit_amount:'',payment_day:'1',status:'active',notes:''});
  const[loading,setLoading]=useState(false);
  const[fetching,setFetching]=useState(true);
  const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    createClient().from('leases').select('*').eq('id',id).maybeSingle().then(({data})=>{
      if(data)setForm({start_date:data.start_date||'',end_date:data.end_date||'',rent_amount:String(data.rent_amount||''),charges_amount:String(data.charges_amount||0),deposit_amount:data.deposit_amount?String(data.deposit_amount):'',payment_day:String(data.payment_day||1),status:data.status||'active',notes:data.notes||''});
      setFetching(false);
    });
  },[id]);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setLoading(true);
    const{error}=await createClient().from('leases').update({...form,rent_amount:Number(form.rent_amount),charges_amount:Number(form.charges_amount),deposit_amount:form.deposit_amount?Number(form.deposit_amount):null,payment_day:Number(form.payment_day)}as never).eq('id',id);
    setLoading(false);if(error){toast.error(error.message);return;}
    qc.bust('re-');toast.success('Bail modifié');router.push('/real-estate/leases/'+id);
  };

  if(fetching)return<div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;
  return(
    <div>
      <div className="flex items-center gap-3 mb-6"><Link href={'/real-estate/leases/'+id} className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link><PageHeader title="Modifier le bail"/></div>
      <form onSubmit={submit} className={cardCls+' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Date de début</label><input type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Date de fin</label><input type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Loyer (FCFA)</label><input type="number" value={form.rent_amount} onChange={e=>set('rent_amount',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Charges (FCFA)</label><input type="number" value={form.charges_amount} onChange={e=>set('charges_amount',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Dépôt (FCFA)</label><input type="number" value={form.deposit_amount} onChange={e=>set('deposit_amount',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Jour de paiement</label><input type="number" min="1" max="31" value={form.payment_day} onChange={e=>set('payment_day',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Statut</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} className={selectCls}>
              <option value="active">Actif</option><option value="terminated">Résilié</option><option value="expired">Expiré</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} className={inputCls}/></div>
        </div>
        <div className="flex gap-3 justify-end mt-6"><Link href={'/real-estate/leases/'+id} className={btnSecondary}>Annuler</Link><button type="submit" disabled={loading} className={btnPrimary}>{loading?<LoadingSpinner size={16}/>:<Save size={16}/>}Enregistrer</button></div>
      </form>
    </div>
  );
}
