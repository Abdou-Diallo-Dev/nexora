'use client';
import { useEffect, useState } from 'react';
import { Plus, Package, Trash2, TrendingDown, TrendingUp, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type SaleItem = {
  id: string; name: string; category: string; unit: string;
  quantity: number; unit_price: number | null; notes: string | null;
};

type Movement = { id: string; item_id: string; type: string; quantity: number; unit_price: number | null; client_name: string | null; reference: string | null; created_at: string };

const CATEGORY_MAP: Record<string, string> = {
  services_rendus: 'Services rendus',
  plateau:         'Plateau',
  rendu_goder:     'Rendu goder',
};

export default function StockVentePage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMovement, setShowMovement] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'services_rendus', unit: 'unité', quantity: '0', unit_price: '', notes: '' });
  const [mvtForm, setMvtForm] = useState({ type: 'out', quantity: '', unit_price: '', client_name: '', reference: '' });

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('sale_stock').select('*').eq('company_id', company.id).order('category').order('name');
    if (filterCat) q = q.eq('category', filterCat);
    q.then(({ data }) => { setItems((data || []) as any); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, filterCat]);

  const handleSave = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('sale_stock').insert({
      company_id: company!.id, name: form.name, category: form.category,
      unit: form.unit, quantity: Number(form.quantity) || 0,
      unit_price: form.unit_price ? Number(form.unit_price) : null, notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Article ajouté');
    setShowForm(false);
    setForm({ name: '', category: 'services_rendus', unit: 'unité', quantity: '0', unit_price: '', notes: '' });
    load();
  };

  const handleMovement = async () => {
    if (!showMovement || !mvtForm.quantity) { toast.error('Quantité requise'); return; }
    setSaving(true);
    const qty = Number(mvtForm.quantity);
    const item = items.find(i => i.id === showMovement);
    const newQty = mvtForm.type === 'in' ? (item?.quantity || 0) + qty : (item?.quantity || 0) - qty;
    if (newQty < 0) { toast.error('Stock insuffisant'); setSaving(false); return; }

    const sb = createClient();
    await sb.from('sale_stock_movements').insert({
      company_id: company!.id, item_id: showMovement, type: mvtForm.type, quantity: qty,
      unit_price: mvtForm.unit_price ? Number(mvtForm.unit_price) : null,
      client_name: mvtForm.client_name || null, reference: mvtForm.reference || null,
    });
    await sb.from('sale_stock').update({ quantity: newQty }).eq('id', showMovement);
    setSaving(false);
    toast.success(mvtForm.type === 'out' ? 'Vente enregistrée' : 'Entrée enregistrée');
    setShowMovement(null);
    setMvtForm({ type: 'out', quantity: '', unit_price: '', client_name: '', reference: '' });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('sale_stock').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const byCategory = Object.entries(CATEGORY_MAP).map(([key, label]) => ({
    key, label, items: items.filter(i => i.category === key),
  })).filter(g => !filterCat || g.key === filterCat);

  return (
    <div>
      <PageHeader title="Stock vente" subtitle={`${items.length} article(s) en catalogue`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Ajouter article</button>}
      />

      <div className="flex gap-3 mb-5">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls + ' w-48'}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-md p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Nouvel article</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nom *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Catégorie *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selectCls + ' w-full'}>
                  {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Unité</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="unité">unité</option>
                  <option value="voyage">voyage</option>
                  <option value="service">service</option>
                  <option value="heure">heure</option>
                  <option value="jour">jour</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Quantité</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Prix unitaire (FCFA)</label>
                <input type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} className={inputCls + ' w-full'} placeholder="0" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {showMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-md p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Mouvement</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select value={mvtForm.type} onChange={e => setMvtForm(f => ({ ...f, type: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="out">Vente / Sortie</option>
                  <option value="in">Entrée / Retour</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Quantité *</label>
                <input type="number" value={mvtForm.quantity} onChange={e => setMvtForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls + ' w-full'} min="1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Prix unitaire (FCFA)</label>
                <input type="number" value={mvtForm.unit_price} onChange={e => setMvtForm(f => ({ ...f, unit_price: e.target.value }))} className={inputCls + ' w-full'} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Client</label>
                <input type="text" value={mvtForm.client_name} onChange={e => setMvtForm(f => ({ ...f, client_name: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Référence</label>
                <input type="text" value={mvtForm.reference} onChange={e => setMvtForm(f => ({ ...f, reference: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowMovement(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleMovement} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<ShoppingBag size={24} />} title="Aucun article" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Ajouter</button>} />
          : (
            <div className="space-y-6">
              {byCategory.map(group => (
                <div key={group.key}>
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                    {group.label} ({group.items.length})
                  </h3>
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-4">Aucun article dans cette catégorie</p>
                  ) : (
                    <div className={cardCls}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-border">
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Article</th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Qté</th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Prix unit.</th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Valeur stock</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {group.items.map(item => (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                              <td className="px-4 py-3 text-right font-bold text-foreground">{item.quantity} {item.unit}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{item.unit_price ? formatCurrency(item.unit_price) : '—'}</td>
                              <td className="px-4 py-3 text-right text-foreground">{item.unit_price ? formatCurrency(item.quantity * item.unit_price) : '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 justify-end">
                                  <button onClick={() => { setShowMovement(item.id); setMvtForm(f => ({ ...f, type: 'in', unit_price: String(item.unit_price || '') })); }} title="Entrée" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><TrendingUp size={14} /></button>
                                  <button onClick={() => { setShowMovement(item.id); setMvtForm(f => ({ ...f, type: 'out', unit_price: String(item.unit_price || '') })); }} title="Vente" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><TrendingDown size={14} /></button>
                                  <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cet article ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
