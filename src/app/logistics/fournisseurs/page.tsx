'use client';
import { useEffect, useState } from 'react';
import { Plus, ShoppingCart, Truck, Trash2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Order = {
  id: string; order_number: string; supplier_name: string;
  order_date: string; expected_date: string | null; received_date: string | null;
  status: string; total_amount: number | null; notes: string | null;
};
type OrderItem = { description: string; quantity: number; unit_price: number; total: number };

const STATUS_MAP: Record<string, { l: string; v: BadgeVariant }> = {
  draft:     { l: 'Brouillon',  v: 'default' },
  sent:      { l: 'Envoyée',    v: 'info'    },
  confirmed: { l: 'Confirmée',  v: 'info'    },
  received:  { l: 'Reçue',      v: 'success' },
  cancelled: { l: 'Annulée',    v: 'default' },
};

export default function FournisseursPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', order_date: new Date().toISOString().split('T')[0], expected_date: '', notes: '' });
  const [lines, setLines] = useState<OrderItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('supplier_orders')
      .select('id,order_number,supplier_name,order_date,expected_date,received_date,status,total_amount,notes', { count: 'exact' })
      .eq('company_id', company.id)
      .order('order_date', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(({ data, count }) => { setItems((data || []) as any); setTotal(count || 0); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, filterStatus, offset]);

  const updateLine = (i: number, field: keyof OrderItem, val: string | number) => {
    setLines(ls => ls.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [field]: field === 'description' ? val : Number(val) };
      updated.total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const orderTotal = lines.reduce((s, l) => s + l.total, 0);

  const handleSave = async () => {
    if (!form.supplier_name) { toast.error('Fournisseur requis'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: ord, error } = await sb.from('supplier_orders').insert({
      company_id: company!.id, supplier_name: form.supplier_name,
      order_date: form.order_date, expected_date: form.expected_date || null,
      status: 'draft', total_amount: orderTotal, notes: form.notes || null,
    }).select('id').single();
    if (!error && ord) {
      await sb.from('supplier_order_items').insert(lines.map(l => ({
        order_id: ord.id, description: l.description, quantity: l.quantity,
        unit_price: l.unit_price, total: l.total,
      })));
    }
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Commande créée');
    setShowForm(false);
    setForm({ supplier_name: '', order_date: new Date().toISOString().split('T')[0], expected_date: '', notes: '' });
    setLines([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    load();
  };

  const handleMarkReceived = async (id: string) => {
    await createClient().from('supplier_orders').update({ status: 'received', received_date: new Date().toISOString().split('T')[0] }).eq('id', id);
    toast.success('Commande marquée comme reçue');
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('supplier_orders').delete().eq('id', deleteId);
    toast.success('Supprimée');
    setDeleteId(null); setDeleting(false); load();
  };

  return (
    <div>
      <PageHeader title="Commandes fournisseurs" subtitle={`${total} commande(s)`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Nouvelle commande</button>}
      />

      <div className="flex gap-3 mb-5">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-44'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto'}>
            <h3 className="font-bold text-lg text-foreground">Nouvelle commande fournisseur</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Fournisseur *</label>
                <input type="text" value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} className={inputCls + ' w-full'} placeholder="Nom du fournisseur" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date commande</label>
                <input type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Livraison prévue</label>
                <input type="date" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Articles commandés</label>
                <button onClick={() => setLines(ls => [...ls, { description: '', quantity: 1, unit_price: 0, total: 0 }])}
                  className="text-xs text-primary hover:underline">+ Ajouter</button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                      className={inputCls + ' col-span-5'} placeholder="Article / Description" />
                    <input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                      className={inputCls + ' col-span-2'} placeholder="Qté" min="1" />
                    <input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)}
                      className={inputCls + ' col-span-3'} placeholder="Prix unit." min="0" />
                    <p className="col-span-2 text-sm font-medium text-right text-foreground">{formatCurrency(line.total)}</p>
                    {lines.length > 1 && (
                      <button onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-red-600 transition-colors text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <p className="text-sm font-black text-foreground">Total: {formatCurrency(orderTotal)}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls + ' w-full'} rows={2} />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Créer commande'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<ShoppingCart size={24} />} title="Aucune commande fournisseur" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Créer commande</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">N°</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Fournisseur</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Commande</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Livraison prévue</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Montant</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(ord => {
                    const sm = STATUS_MAP[ord.status] || { l: ord.status, v: 'default' as BadgeVariant };
                    return (
                      <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ord.order_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{ord.supplier_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(ord.order_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ord.expected_date ? formatDate(ord.expected_date) : '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{ord.total_amount ? formatCurrency(ord.total_amount) : '—'}</td>
                        <td className="px-4 py-3"><Badge variant={sm.v}>{sm.l}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {ord.status !== 'received' && ord.status !== 'cancelled' && (
                              <button onClick={() => handleMarkReceived(ord.id)} title="Marquer reçue" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle size={14} /></button>
                            )}
                            <button onClick={() => setDeleteId(ord.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-border">
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
              </div>
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cette commande ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
