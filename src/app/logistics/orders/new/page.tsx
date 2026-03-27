'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Package, User, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

type Client = { id: string; name: string; phone: string | null };

const GOODS_TYPES = ['Électronique','Textile','Alimentaire','Construction','Mobilier','Documents','Médicaments','Chimique','Autre'];

export default function NewOrderPage() {
  const { company, user } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    client_id: '',
    pickup_address: '', pickup_city: '',
    delivery_address: '', delivery_city: '',
    goods_type: '', goods_description: '',
    weight_kg: '', volume_m3: '', quantity: '',
    priority: 'normal',
    amount: '',
    payment_method: 'cash',
    scheduled_date: '',
    notes: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!company?.id) return;
    createClient()
      .from('logistics_clients')
      .select('id,name,phone')
      .eq('company_id', company.id)
      .order('name')
      .then(({ data }) => setClients((data || []) as Client[]));
  }, [company?.id]);

  const save = async () => {
    if (!form.pickup_address || !form.delivery_address) {
      toast.error('Les adresses de départ et destination sont requises');
      return;
    }
    setSaving(true);
    const { error } = await createClient().from('logistics_orders').insert({
      company_id:       company!.id,
      client_id:        form.client_id       || null,
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
      payment_method:    form.payment_method,
      scheduled_date:    form.scheduled_date   || null,
      notes:             form.notes            || null,
      created_by:        user?.id,
      status:            'confirmed',
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Commande créée !');
    router.push('/logistics/orders');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/logistics/orders" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader title="Nouvelle commande" subtitle="Créer une commande client" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">

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
                  <input value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)}
                    placeholder="Ex: 12 Rue Sandaga" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ville de départ</label>
                  <input value={form.pickup_city} onChange={e => set('pickup_city', e.target.value)}
                    placeholder="Ex: Dakar" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Adresse de destination *</label>
                  <input value={form.delivery_address} onChange={e => set('delivery_address', e.target.value)}
                    placeholder="Ex: 5 Av. Bourguiba" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Ville de destination</label>
                  <input value={form.delivery_city} onChange={e => set('delivery_city', e.target.value)}
                    placeholder="Ex: Thiès" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Date souhaitée</label>
                <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)}
                  className={inputCls} />
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
                <label className={labelCls}>Type de marchandise</label>
                <select value={form.goods_type} onChange={e => set('goods_type', e.target.value)} className={selectCls + ' w-full'}>
                  <option value="">— Choisir —</option>
                  {GOODS_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Priorité</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { v: 'normal',  l: 'Normal',  c: 'text-slate-600'  },
                    { v: 'express', l: 'Express', c: 'text-orange-600' },
                    { v: 'urgent',  l: 'Urgent',  c: 'text-red-600'    },
                  ].map(p => (
                    <button key={p.v} type="button" onClick={() => set('priority', p.v)}
                      className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.priority === p.v ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary' : `${p.c} border-current/30 border`}`}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Quantité</label>
                <input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  placeholder="Ex: 10" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Poids (kg)</label>
                <input type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
                  placeholder="Ex: 50" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Volume (m³)</label>
                <input type="number" value={form.volume_m3} onChange={e => set('volume_m3', e.target.value)}
                  placeholder="Ex: 2" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <input value={form.goods_description} onChange={e => set('goods_description', e.target.value)}
                  placeholder="Ex: 5 cartons de marchandises fragiles" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={cardCls + ' p-5'}>
            <label className={labelCls}>Notes / Instructions</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="Instructions particulières..." className={inputCls + ' resize-none w-full mt-1'} />
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
              <option value="">— Choisir un client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
            </select>
            <Link href="/logistics/clients/new" className="text-xs text-primary hover:underline mt-2 block">+ Nouveau client</Link>
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
                <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                  placeholder="Ex: 25000" className={inputCls} />
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
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <button onClick={save} disabled={saving} className={btnPrimary + ' w-full justify-center py-3'}>
              {saving ? <LoadingSpinner size={16} /> : <Package size={16} />}
              {saving ? 'Création...' : 'Créer la commande'}
            </button>
            <Link href="/logistics/orders" className={btnSecondary + ' text-center py-3'}>Annuler</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
