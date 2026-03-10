'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader, LoadingSpinner, ConfirmDialog, btnSecondary, cardCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; city: string | null; notes: string | null; created_at: string };

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    createClient().from('clients').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => { setClient(data as Client); setLoading(false); });
  }, [id]);

  const del = async () => {
    await createClient().from('clients').delete().eq('id', id);
    toast.success('Client supprimé');
    router.push('/logistics/clients');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;
  if (!client) return <div className="text-center py-16 text-muted-foreground">Client introuvable</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/clients" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <div className="flex-1" />
        <button onClick={() => setConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
          <Trash2 size={16} />Supprimer
        </button>
      </div>
      <PageHeader title={client.name} />
      <div className={cardCls + ' divide-y divide-border'}>
        {client.email && <div className="flex items-center gap-3 px-5 py-3"><Mail size={14} className="text-muted-foreground" /><a href={'mailto:' + client.email} className="text-sm text-primary hover:underline">{client.email}</a></div>}
        {client.phone && <div className="flex items-center gap-3 px-5 py-3"><Phone size={14} className="text-muted-foreground" /><a href={'tel:' + client.phone} className="text-sm text-foreground">{client.phone}</a></div>}
        {(client.address || client.city) && <div className="flex items-center gap-3 px-5 py-3"><MapPin size={14} className="text-muted-foreground" /><span className="text-sm text-foreground">{[client.address, client.city].filter(Boolean).join(', ')}</span></div>}
        <div className="flex items-center justify-between px-5 py-3"><span className="text-sm text-muted-foreground">Inscrit le</span><span className="text-sm font-medium text-foreground">{formatDate(client.created_at)}</span></div>
        {client.notes && <div className="px-5 py-3"><p className="text-sm text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground">{client.notes}</p></div>}
      </div>
      <ConfirmDialog open={confirm} title="Supprimer ce client ?" onConfirm={del} onCancel={() => setConfirm(false)} />
    </div>
  );
}
