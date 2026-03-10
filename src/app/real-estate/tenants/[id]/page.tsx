'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Badge, LoadingSpinner, ConfirmDialog, btnSecondary, cardCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

type Tenant = { id:string; first_name:string; last_name:string; email:string; phone:string|null; nationality:string|null; birth_date:string|null; status:string; notes:string|null; created_at:string };

export default function TenantDetailPage() {
  const { id } = useParams<{ id:string }>();
  const router = useRouter();
  const [t, setT] = useState<Tenant|null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    createClient().from('tenants').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => { setT(data as Tenant); setLoading(false); });
  }, [id]);

  const del = async () => {
    await createClient().from('tenants').delete().eq('id', id);
    qc.bust('re-'); toast.success('Locataire supprimé');
    router.push('/real-estate/tenants');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;
  if (!t) return <div className="text-center py-16 text-muted-foreground">Locataire introuvable</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/tenants" className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link>
        <div className="flex-1"/>
        <Link href={'/real-estate/tenants/'+id+'/edit'} className={btnSecondary}><Edit size={16}/>Modifier</Link>
        <button onClick={()=>setConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"><Trash2 size={16}/>Supprimer</button>
      </div>
      <PageHeader title={t.first_name+' '+t.last_name} subtitle={'Locataire · '+(t.status==='active'?'Actif':'Inactif')}/>
      <div className={cardCls+' divide-y divide-border'}>
        {[['Email',t.email],['Téléphone',t.phone||'—'],['Nationalité',t.nationality||'—'],['Date de naissance',t.birth_date?formatDate(t.birth_date):'—'],['Statut',t.status==='active'?'Actif':'Inactif'],['Inscrit le',formatDate(t.created_at)]].map(([l,v])=>(
          <div key={l} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-muted-foreground">{l}</span>
            <span className="text-sm font-medium text-foreground">{v}</span>
          </div>
        ))}
        {t.notes&&<div className="px-5 py-3"><p className="text-sm text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground">{t.notes}</p></div>}
      </div>
      <ConfirmDialog open={confirm} title="Supprimer ce locataire ?" description="Cette action est irréversible." onConfirm={del} onCancel={()=>setConfirm(false)}/>
    </div>
  );
}
