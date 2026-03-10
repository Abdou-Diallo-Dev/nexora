'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';

type Expense={id:string;amount:number;category:string;description:string;date:string;vendor:string|null;properties:{name:string}|null};
const CATS:Record<string,string>={fuel:'Carburant',electricity:'Électricité',supplies:'Fournitures',maintenance:'Maintenance',taxes:'Taxes',insurance:'Assurance',other:'Autre'};

export default function ExpensesPage(){
  const{company}=useAuthStore();
  const[items,setItems]=useState<Expense[]>([]);
  const[total,setTotal]=useState(0);
  const[loading,setLoading]=useState(true);
  const{page,pageSize,offset,setPage}=usePagination(20);

  useEffect(()=>{
    if(!company?.id)return;setLoading(true);
    createClient().from('expenses').select('id,amount,category,description,date,vendor,properties(name)',{count:'exact'})
      .eq('company_id',company.id).order('date',{ascending:false}).range(offset,offset+pageSize-1)
      .then(({data,count})=>{setItems((data||[])as unknown as Expense[]);setTotal(count||0);setLoading(false);});
  },[company?.id,offset,pageSize]);

  const totalAmt=items.reduce((s,i)=>s+i.amount,0);

  return(
    <div>
      <PageHeader title="Dépenses" subtitle={formatCurrency(totalAmt)+' (page courante)'} actions={<Link href="/real-estate/expenses/new" className={btnPrimary}><Plus size={16}/>Nouvelle dépense</Link>}/>
      {loading?<div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
       :items.length===0?<EmptyState icon={<Receipt size={24}/>} title="Aucune dépense" action={<Link href="/real-estate/expenses/new" className={btnPrimary}><Plus size={16}/>Ajouter</Link>}/>
       :<div className={cardCls}><div className="divide-y divide-border">{items.map(e=>(
          <div key={e.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{e.description}</p>
              <p className="text-xs text-muted-foreground">{CATS[e.category]||e.category} · {e.properties?.name||'—'} · {formatDate(e.date)}</p>
            </div>
            <p className="text-sm font-semibold text-red-600">-{formatCurrency(e.amount)}</p>
          </div>
        ))}</div><Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/></div>}
    </div>
  );
}
