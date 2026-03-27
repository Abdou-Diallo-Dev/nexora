'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, MapPin, Package, User, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';

type Client = { id: string; name: string; phone: string | null };

const GOODS_TYPES = ['Électronique','Textile','Alimentaire','Construction','Mobilier','Documents','Médicaments','Chimique','Autre'];

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    client_id: '',
    status: 'confirmed',
    pickup_address: '', pickup_city: '',
    delivery_address: '', delivery_city: '',
    goods_type: '', goods_description: '',
    weight_kg: '', volume_m3: '', quantity: '',
    priority: 'normal',
    amount: '',
    payment_method: 'cash',
    payment_status: 'pending',
    scheduled_date: '',
    notes: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!id || !company?.id) return;
    const sb = createClient();
    Promise.all([
      sb.from('logistics_orders').select('*').eq('id', id).eq('company_id', company.id).maybeSingle(),
      sb.from('logistics_clients').select('id,name,phone').eq('company_id', company.id).order('name'),
    ]).then(([{ data: order }, { data: cl }]) => {
      if (!order) { router.replace('/logistics/orders'); return; }
      setForm({
        client_id:        order.client_id        || '',
        status:           order.status           || 'confirmed',
        pickup_address:   order.pickup_address   || '',
        pickup_city:      order.pickup_city      || '',
        delivery_address: order.delivery_address || '',
        delivery_city:    order.delivery_city    || '',
        goods_type:        order.goods_type        || '',
        goods_description: order.goods_description || '',
        weight_kg:  order.weight_kg  != null ? String(order.weight_kg)  : '',
        volume_m3:  order.volume_m3  != null ? String(order.volume_m3)  : '',
        quantity:   order.quantity   != null ? String(order.quantity)   : '',
        priority:          order.priority          || 'normal',
        amount:     order.amount     != null ? String(order.amount)     : '',
        payment_method:    order.payment_method    || 'cash',
        payment_status:    order.payment_status    || 'pending',
        scheduled_date:    order.scheduled_date    || '',
        notes:             order.notes             || '',
      });
      setClients((cl || []) as Client[]);
      setLoading(false);
    });
  }, [id, company?.id]);

  const save = async () => {
    if (!form.pickup_address || !form.delivery_address) {
      toast.error('Les adresses de départ et destination sont requises');
      return;
    }
    setSaving(true);
    const { error } = await createClient()
      .from('logistics_orders')
      .update({
        client_id:        form.client_id       || null,
        status:           form.status,
        pickup_address:   form.pickup_address,
        pickup_city:      form.pickup_city      || null,
        delivery_address: form.delivery_address,
        delivery_city:    form.delivery_city    || null,
        goods_type:        form.goods_type        || null,
        goods_description: form.goods_description || null,
        weight_kg:  parseFloat(form.weight_kg)  || null,
        volume_m3:  parseFloat(form.volume_m3)  || null,
        quantity:   parseInt(form.quantity)     || null,
        priority:          form.priority,
        amount:     parseFloat(form.amount)     || 0,
        payment_method: form.payment_method,
        payment_status: form.payment_status,
        scheduled_date: form.scheduled_date || null,
        notes:          form.notes          || null,
      })
      .eq('id', id as string);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Commande mise à jour');
    router.push(`/logistics/orders/${id}`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36} /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/logistics/orders/${id}`} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader title="Modifier la commande" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Statut */}
          <div className={cardCls + ' p-5'}>
            <label className={labelCls}>Statut</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
              {[
                { v: 'draft',       l: 'Brouillon'  },
                { v: 'confirmed',   l: 'Confirmée' },
                { v: 'in_progress', l: 'En cours'  },
                { v: 'completed',   l: 'Terminée'  },
                { v: 'cancelled',   l: 'Annulée'   },
              ].map(s => (
                <button key={s.v} type="button" onClick={() => set('status', s.v)}
                  className={`py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all ${form.status === s.v ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary' : 'border-border text-muted-foreground'}`}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          {/* Itinéraire */}
          <div className={cardCls + ' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">Itinéraire</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Adresse de départ *</label>
                  <input value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ville de départ</label>
                  <input value={form.pickup_city} onChange={e => set('pickup_city', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Adresse de destination *</label>
                  <input value={form.delivery_address} onChange={e => set('delivery_address', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ville de destination</label>
                  <input value={form.delivery_city} onChange={e => set('delivery_city', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Date souhaitée</label>
                <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Marchandise */}
          <div className={cardCls + ' p-5'}>
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">Marchandise</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Type</label>
                <select value={form.goods_type} onChange={e => set('goods_type', e.target.value)} className={selectCls + ' w-full'}>
                  <option value="">— Choisir —</option>
                  {GOODS_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Priorité</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { v: 'normal',  l: 'Normal'  },
                    { v: 'express', l: 'Express' },
                    { v: 'urgent',  l: 'Urgent'  },
                  ].map(p => (
                    <button key={p.v} type="button" onClick={() => set('priority', p.v)}
                      className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.priority === p.v ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary' : 'border-border text-muted-foreground'}`}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Quantité</label>
                <input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Poids (kg)</label>
                <input type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Volume (m³)</label>
                <input type="number" value={form.volume_m3} onChange={e => set('volume_m3', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <input value={form.goods_description} onChange={e => set('goods_description', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={cardCls + ' p-5'}>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} className={inputCls + ' resize-none w-full mt-1'} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          <div className={cardCls + ' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <User size={15} className="text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Client</h3>
            </div>
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)} className={selectCls + ' w-full'}>
              <option value="">— Aucun —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
            </select>
          </div>

          {/* Tarification */}
          <div className={cardCls + ' p-5'}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={15} className="text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Tarification</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Montant (FCFA)</label>
                <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mode de paiement</label>
                <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={selectCls + ' w-full'}>
                  <option value="cash">Espèces</option>
                  <option value="wave">Wave</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="free_money">Free Money</option>
                  <option value="credit">Crédit</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Statut paiement</label>
                <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)} className={selectCls + ' w-full'}>
                  <option value="pending">En attente</option>
                  <option value="partial">Partiel</option>
                  <option value="paid">Payé</option>
                </select>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <button onClick={save} disabled={saving} className={btnPrimary + ' w-full justify-center py-3'}>
              {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
            <Link href={`/logistics/orders/${id}`} className={btnSecondary + ' text-center py-3'}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
