'use client';
import { useEffect, useState } from 'react';
import { Plus, Package, AlertTriangle, Trash2, ArrowUpDown, TrendingDown, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type StockItem = {
  id: string; name: string; category: string | null; unit: string;
  quantity: number; min_quantity: number; unit_cost: number | null;
  supplier: string | null; location: string | null; notes: string | null;
  stock_level?: string;
};

type Movement = {
  id: string; item_id: string; type: string; quantity: number;
  reason: string | null; reference: string | null; created_at: string;
  performed_by: string | null;
};

const LEVEL_MAP: Record<string, { l: string; v: BadgeVariant; color: string }> = {
  rupture:  { l: 'Rupture',  v: 'error',   color: 'text-red-600 bg-red-50' },
  critique: { l: 'Critique', v: 'error',   color: 'text-red-600 bg-red-50' },
  faible:   { l: 'Faible',   v: 'warning', color: 'text-amber-600 bg-amber-50' },
  ok:       { l: 'OK',       v: 'success', color: 'text-green-600 bg-green-50' },
};

export default function StockMaintenancePage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMovement, setShowMovement] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', unit: 'pièce', quantity: '0', min_quantity: '5', unit_cost: '', supplier: '', location: '', notes: '' });
  const [mvtForm, setMvtForm] = useState({ type: 'in', quantity: '', reason: '', reference: '', performed_by: '' });

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('maintenance_stock_summary')
      .select('*')
      .eq('company_id', company.id)
      .order('name')
      .then(({ data }) => { setItems((data || []) as any); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id]);

  const loadMovements = (itemId: string) => {
    createClient().from('maintenance_stock_movements')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setMovements((data || []) as any));
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Nom requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('maintenance_stock').insert({
      company_id: company!.id, name: form.name, category: form.category || null,
      unit: form.unit, quantity: Number(form.quantity) || 0,
      min_quantity: Number(form.min_quantity) || 5,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      supplier: form.supplier || null, location: form.location || null, notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Article ajouté');
    setShowForm(false);
    setForm({ name: '', category: '', unit: 'pièce', quantity: '0', min_quantity: '5', unit_cost: '', supplier: '', location: '', notes: '' });
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
    await sb.from('maintenance_stock_movements').insert({
      company_id: company!.id, item_id: showMovement, type: mvtForm.type,
      quantity: qty, reason: mvtForm.reason || null,
      reference: mvtForm.reference || null, performed_by: mvtForm.performed_by || null,
    });
    await sb.from('maintenance_stock').update({ quantity: newQty }).eq('id', showMovement);
    setSaving(false);
    toast.success(mvtForm.type === 'in' ? 'Entrée enregistrée' : 'Sortie enregistrée');
    setShowMovement(null);
    setMvtForm({ type: 'in', quantity: '', reason: '', reference: '', performed_by: '' });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('maintenance_stock').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const alerts = items.filter(i => i.stock_level === 'rupture' || i.stock_level === 'critique' || i.stock_level === 'faible');

  return (
    <div>
      <PageHeader title="Stock maintenance" subtitle={`${items.length} article(s) · ${alerts.length} alerte(s)`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Ajouter article</button>}
      />

      {alerts.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">{alerts.length} article(s) avec stock faible ou en rupture</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-lg p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Nouvel article</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nom *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls + ' w-full'} placeholder="Filtre à huile, courroie..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Catégorie</label>
                <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls + ' w-full'} placeholder="Filtres, freins..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Unité</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="pièce">pièce</option>
                  <option value="litre">litre</option>
                  <option value="kg">kg</option>
                  <option value="boite">boite</option>
                  <option value="lot">lot</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Quantité initiale</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Seuil alerte</label>
                <input type="number" value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Prix unitaire (FCFA)</label>
                <input type="number" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} className={inputCls + ' w-full'} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Emplacement</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls + ' w-full'} placeholder="Étagère A3..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Fournisseur</label>
                <input type="text" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Enregistrement...' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Movement modal */}
      {showMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-md p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Mouvement de stock</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select value={mvtForm.type} onChange={e => setMvtForm(f => ({ ...f, type: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="in">Entrée</option>
                  <option value="out">Sortie</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Quantité *</label>
                <input type="number" value={mvtForm.quantity} onChange={e => setMvtForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls + ' w-full'} min="1" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Raison</label>
                <input type="text" value={mvtForm.reason} onChange={e => setMvtForm(f => ({ ...f, reason: e.target.value }))} className={inputCls + ' w-full'} placeholder="Maintenance camion TH-001..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Référence</label>
                <input type="text" value={mvtForm.reference} onChange={e => setMvtForm(f => ({ ...f, reference: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Réalisé par</label>
                <input type="text" value={mvtForm.performed_by} onChange={e => setMvtForm(f => ({ ...f, performed_by: e.target.value }))} className={inputCls + ' w-full'} />
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
        : items.length === 0 ? <EmptyState icon={<Package size={24} />} title="Aucun article en stock" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Ajouter</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Article</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Stock</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Seuil</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Valeur</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Niveau</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(item => {
                    const lv = LEVEL_MAP[item.stock_level || 'ok'] || LEVEL_MAP.ok;
                    const value = item.unit_cost ? item.quantity * item.unit_cost : null;
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.category || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.min_quantity} {item.unit}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{value ? formatCurrency(value) : '—'}</td>
                        <td className="px-4 py-3"><Badge variant={lv.v}>{lv.l}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setShowMovement(item.id); setMvtForm(f => ({ ...f, type: 'in' })); }} title="Entrée" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><TrendingUp size={14} /></button>
                            <button onClick={() => { setShowMovement(item.id); setMvtForm(f => ({ ...f, type: 'out' })); }} title="Sortie" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><TrendingDown size={14} /></button>
                            <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cet article ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
