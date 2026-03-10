'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Edit, Trash2, ArrowLeft, Phone, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, Badge, LoadingSpinner, ConfirmDialog, btnSecondary, cardCls } from '@/components/ui';
import { formatCurrency, formatDate, getPropertyTypeLabel } from '@/lib/utils';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

type Property = { id:string; name:string; address:string; city:string; zip_code:string|null; country:string|null; type:string; status:string; rent_amount:number; charges_amount:number; surface_area:number|null; rooms_count:number|null; description:string|null; owner_name:string|null; owner_email:string|null; owner_phone:string|null; created_at:string };
const STATUS_LABELS: Record<string,string> = { available:'Disponible', rented:'Loué', maintenance:'Maintenance', inactive:'Inactif' };

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prop, setProp] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    createClient().from('properties').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => { setProp(data as Property | null); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await createClient().from('properties').delete().eq('id', id);
    if (error) { toast.error('Erreur lors de la suppression'); setDeleting(false); return; }
    qc.bust('re-'); toast.success('Bien supprimé');
    router.push('/real-estate/properties');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;
  if (!prop) return <div className="text-center py-16 text-muted-foreground">Bien introuvable</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/properties" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <div className="flex-1" />
        <Link href={'/real-estate/properties/' + id + '/edit'} className={btnSecondary}><Edit size={16} />Modifier</Link>
        <button onClick={() => setConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
          <Trash2 size={16} />Supprimer
        </button>
      </div>
      <PageHeader title={prop.name} subtitle={prop.address + ', ' + prop.city} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={cardCls + ' lg:col-span-2 divide-y divide-border'}>
          {[
            ['Type', getPropertyTypeLabel(prop.type)],
            ['Statut', STATUS_LABELS[prop.status] || prop.status],
            ['Adresse', prop.address + ', ' + prop.city + (prop.zip_code ? ' ' + prop.zip_code : '')],
            ['Loyer mensuel', formatCurrency(prop.rent_amount)],
            ['Charges', formatCurrency(prop.charges_amount)],
            ['Surface', prop.surface_area ? prop.surface_area + ' m²' : '—'],
            ['Pièces', prop.rooms_count?.toString() || '—'],
            ['Ajouté le', formatDate(prop.created_at)],
          ].map(([l, v]) => (
            <div key={l} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-muted-foreground">{l}</span>
              <span className="text-sm font-medium text-foreground">{v}</span>
            </div>
          ))}
          {prop.description && (
            <div className="px-5 py-3">
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground">{prop.description}</p>
            </div>
          )}
        </div>
        {(prop.owner_name || prop.owner_email || prop.owner_phone) && (
          <div className={cardCls + ' p-5'}>
            <h3 className="font-semibold text-foreground mb-3 text-sm">Propriétaire</h3>
            {prop.owner_name && <p className="font-medium text-foreground mb-2">{prop.owner_name}</p>}
            {prop.owner_email && <a href={'mailto:' + prop.owner_email} className="flex items-center gap-2 text-sm text-primary hover:underline mb-1"><Mail size={14} />{prop.owner_email}</a>}
            {prop.owner_phone && <a href={'tel:' + prop.owner_phone} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone size={14} />{prop.owner_phone}</a>}
          </div>
        )}
      </div>
      <ConfirmDialog open={confirm} title="Supprimer ce bien ?" description="Cette action est irréversible."
        onConfirm={handleDelete} onCancel={() => setConfirm(false)} confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} />
    </div>
  );
}
