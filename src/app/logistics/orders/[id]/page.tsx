'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Package, User, DollarSign, Clock, CheckCircle, XCircle, Phone, Edit, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, cardCls, btnPrimary } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Order = {
  id: string; reference: string; status: string; priority: string;
  pickup_address: string; pickup_city: string | null;
  delivery_address: string; delivery_city: string | null;
  goods_type: string | null; goods_description: string | null;
  weight_kg: number | null; volume_m3: number | null; quantity: number | null;
  amount: number; payment_method: string | null; payment_status: string;
  scheduled_date: string | null; notes: string | null;
  created_at: string;
  logistics_clients: { id: string; name: string; phone: string | null } | null;
};

const STATUS_FLOW = [
  { key: 'draft',       label: 'Brouillon',  icon: <Clock size={15} />,          color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200'   },
  { key: 'confirmed',   label: 'Confirmée',  icon: <CheckCircle size={15} />,    color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'     },
  { key: 'in_progress', label: 'En cours',   icon: <RefreshCw size={15} />,      color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200' },
  { key: 'completed',   label: 'Terminée',   icon: <CheckCircle size={15} />,    color: 'text-green-600',   bg: 'bg-green-50 border-green-200'   },
  { key: 'cancelled',   label: 'Annulée',    icon: <XCircle size={15} />,        color: 'text-red-600',     bg: 'bg-red-50 border-red-200'       },
];

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  normal:  { label: 'Normal',  color: 'text-slate-600 bg-slate-50'   },
  express: { label: 'Express', color: 'text-orange-600 bg-orange-50' },
  urgent:  { label: 'URGENT',  color: 'text-red-600 bg-red-50'       },
};

const PAYMENT_METHOD: Record<string, string> = {
  cash: 'Espèces', wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', credit: 'Crédit',
};

export default function OrderDetailPage() {
  const { company } = useAuthStore();
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder]             = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [newStatus, setNewStatus]     = useState('');

  useEffect(() => {
    if (!company?.id || !id) return;
    createClient()
      .from('logistics_orders')
      .select('*,logistics_clients(id,name,phone)')
      .eq('id', id)
      .eq('company_id', company.id)
      .maybeSingle()
      .then(({ data }) => {
        setOrder(data as Order);
        setNewStatus(data?.status || '');
        setLoading(false);
      });
  }, [company?.id, id]);

  const updateStatus = async () => {
    if (!order || !newStatus) return;
    setSaving(true);
    const { error } = await createClient()
      .from('logistics_orders')
      .update({ status: newStatus })
      .eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Statut mis à jour');
    setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
    setShowModal(false);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={36} /></div>;
  if (!order)  return <div className="text-center py-16 text-muted-foreground">Commande introuvable</div>;

  const currentStatus = STATUS_FLOW.find(s => s.key === order.status);
  const pm = PRIORITY_MAP[order.priority] || PRIORITY_MAP.normal;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/logistics/orders" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{order.reference}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pm.color}`}>{pm.label}</span>
            {currentStatus && (
              <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${currentStatus.color} ${currentStatus.bg}`}>
                {currentStatus.icon}{currentStatus.label}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/logistics/orders/${id}/edit`} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Edit size={15} /> Modifier
          </Link>
          <button onClick={() => setShowModal(true)} className={btnPrimary}>
            <RefreshCw size={15} /> Changer statut
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className={cardCls + ' p-4'}>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Progression</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_FLOW.filter(s => s.key !== 'cancelled').map((s, i, arr) => {
            const flow = ['draft','confirmed','in_progress','completed'];
            const done = flow.indexOf(order.status) >= flow.indexOf(s.key);
            return (
              <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${done ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-muted-foreground'}`}>
                  {s.icon}{s.label}
                </div>
                {i < arr.length - 1 && <div className={`w-4 h-0.5 flex-shrink-0 ${done ? 'bg-primary' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Itinéraire */}
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-2 mb-4"><MapPin size={15} className="text-primary" /><h3 className="font-semibold text-foreground">Itinéraire</h3></div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 bg-green-500 rounded-full" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">DÉPART</p>
                <p className="font-medium text-foreground text-sm">{order.pickup_address}</p>
                {order.pickup_city && <p className="text-xs text-muted-foreground">{order.pickup_city}</p>}
              </div>
            </div>
            <div className="ml-4"><div className="w-0.5 h-5 bg-border" /></div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">DESTINATION</p>
                <p className="font-medium text-foreground text-sm">{order.delivery_address}</p>
                {order.delivery_city && <p className="text-xs text-muted-foreground">{order.delivery_city}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Marchandise */}
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-2 mb-4"><Package size={15} className="text-primary" /><h3 className="font-semibold text-foreground">Marchandise</h3></div>
          <div className="space-y-2">
            {order.goods_type        && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><span className="font-medium text-foreground">{order.goods_type}</span></div>}
            {order.goods_description && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Description</span><span className="font-medium text-foreground text-right max-w-[60%]">{order.goods_description}</span></div>}
            {order.quantity          && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Quantité</span><span className="font-medium text-foreground">{order.quantity}</span></div>}
            {order.weight_kg         && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Poids</span><span className="font-medium text-foreground">{order.weight_kg} kg</span></div>}
            {order.volume_m3         && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Volume</span><span className="font-medium text-foreground">{order.volume_m3} m³</span></div>}
            {order.scheduled_date    && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date souhaitée</span><span className="font-medium text-foreground">{order.scheduled_date}</span></div>}
            {order.notes && <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl text-xs text-muted-foreground">{order.notes}</div>}
            {!order.goods_type && !order.quantity && !order.weight_kg && <p className="text-sm text-muted-foreground">Aucun détail renseigné</p>}
          </div>
        </div>

        {/* Client */}
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-2 mb-4"><User size={15} className="text-primary" /><h3 className="font-semibold text-foreground">Client</h3></div>
          {order.logistics_clients ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {order.logistics_clients.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-foreground">{order.logistics_clients.name}</p>
                {order.logistics_clients.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} />{order.logistics_clients.phone}</p>
                )}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Client non renseigné</p>}
        </div>

        {/* Paiement */}
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-2 mb-4"><DollarSign size={15} className="text-primary" /><h3 className="font-semibold text-foreground">Paiement</h3></div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Montant</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(order.amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-medium text-foreground">{PAYMENT_METHOD[order.payment_method || ''] || order.payment_method || '—'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Statut paiement</span>
              <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                {order.payment_status === 'paid' ? 'Payé' : order.payment_status === 'partial' ? 'Partiel' : 'En attente'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <h3 className="font-bold text-foreground mb-4">Changer le statut</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {STATUS_FLOW.map(s => (
                <button key={s.key} onClick={() => setNewStatus(s.key)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${newStatus === s.key ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  {s.icon}{s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 transition-colors">Annuler</button>
              <button onClick={updateStatus} disabled={saving} className={btnPrimary + ' flex-1 justify-center py-2.5'}>
                {saving ? <LoadingSpinner size={15} /> : <CheckCircle size={15} />}
                {saving ? 'Mise à jour...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
