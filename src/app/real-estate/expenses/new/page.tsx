'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

export default function NewExpensePage(){
  const{company}=useAuthStore();
  const router=useRouter();
  const[props,setProps]=useState<{id:string;name:string}[]>([]);
  const[form,setForm]=useState({property_id:'',category:'other',amount:'',description:'',date:new Date().toISOString().slice(0,10),vendor:'',payment_method:'cash',notes:''});
  const[loading,setLoading]=useState(false);
  const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{if(!company?.id)return;createClient().from('properties').select('id,name').eq('company_id',company.id).then(({data})=>setProps(data||[]));},[company?.id]);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();if(!company?.id)return;setLoading(true);
    const{error}=await createClient().from('expenses').insert({...form,amount:Number(form.amount),company_id:company.id,property_id:form.property_id||null}as never);
    setLoading(false);if(error){toast.error(error.message);return;}
    qc.bust('re-');toast.success('Dépense enregistrée');router.push('/real-estate/expenses');
  };

  return(
    <div>
      <div className="flex items-center gap-3 mb-6"><Link href="/real-estate/expenses" className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link><PageHeader title="Nouvelle dépense"/></div>
      <form onSubmit={submit} className={cardCls+' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Bien concerné</label><select value={form.property_id} onChange={e=>set('property_id',e.target.value)} className={selectCls}><option value="">Général</option>{props.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className={labelCls}>Catégorie *</label><select value={form.category} onChange={e=>set('category',e.target.value)} className={selectCls}>{[['fuel','Carburant'],['electricity','Électricité'],['supplies','Fournitures'],['maintenance','Maintenance'],['taxes','Taxes/Impôts'],['insurance','Assurance'],['other','Autre']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className={labelCls}>Montant (FCFA) *</label><input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} required className={inputCls}/></div>
          <div><label className={labelCls}>Date *</label><input type="date" value={form.date} onChange={e=>set('date',e.target.value)} required className={inputCls}/></div>
          <div><label className={labelCls}>Fournisseur</label><input value={form.vendor} onChange={e=>set('vendor',e.target.value)} className={inputCls}/></div>
          <div><label className={labelCls}>Mode de paiement</label><select value={form.payment_method} onChange={e=>set('payment_method',e.target.value)} className={selectCls}>{[['cash','Espèces'],['bank_transfer','Virement'],['wave','Wave'],['orange_money','Orange Money'],['check','Chèque']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <div className="md:col-span-2"><label className={labelCls}>Description *</label><input value={form.description} onChange={e=>set('description',e.target.value)} required placeholder="Description de la dépense" className={inputCls}/></div>
          <div className="md:col-span-2"><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} className={inputCls}/></div>
        </div>
        <div className="flex gap-3 justify-end mt-6"><Link href="/real-estate/expenses" className={btnSecondary}>Annuler</Link><button type="submit" disabled={loading} className={btnPrimary}>{loading?<LoadingSpinner size={16}/>:<Save size={16}/>}Enregistrer</button></div>
      </form>
    </div>
  );
}
