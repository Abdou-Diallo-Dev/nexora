'use client';
import { useEffect, useState } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, inputCls, selectCls, ConfirmDialog } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type Budget = {
  id: string; year: number; month: number; category: string;
  planned_amount: number; actual_amount: number; notes: string | null;
};

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const CATEGORIES = ['carburant','salaire','maintenance','loyer','assurance','fournitures','transport','divers'];

export default function BudgetPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: 'carburant', planned_amount: '', actual_amount: '0', notes: '' });

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('monthly_budgets')
      .select('*')
      .eq('company_id', company.id)
      .eq('year', year)
      .eq('month', month)
      .order('category')
      .then(({ data }) => { setItems((data || []) as any); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, year, month]);

  const handleSave = async () => {
    if (!form.planned_amount) { toast.error('Montant prévu requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('monthly_budgets').upsert({
      company_id: company!.id, year, month, category: form.category,
      planned_amount: Number(form.planned_amount), actual_amount: Number(form.actual_amount) || 0,
      notes: form.notes || null,
    }, { onConflict: 'company_id,year,month,category' });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Budget enregistré');
    setShowForm(false);
    setForm({ category: 'carburant', planned_amount: '', actual_amount: '0', notes: '' });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('monthly_budgets').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const totalPlanned = items.reduce((s, b) => s + Number(b.planned_amount), 0);
  const totalActual = items.reduce((s, b) => s + Number(b.actual_amount), 0);
  const variance = totalPlanned - totalActual;

  return (
    <div>
      <PageHeader title="Budget mensuel"
        subtitle={`${MONTHS[month - 1]} ${year} — Prévu: ${formatCurrency(totalPlanned)}`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Ajouter ligne</button>}
      />

      {/* Month/Year picker */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={selectCls + ' w-28'}>
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className={selectCls + ' w-36'}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Budget prévu</p>
            <p className="text-xl font-black text-blue-700">{formatCurrency(totalPlanned)}</p>
          </div>
          <div className={`p-4 rounded-2xl border ${totalActual > totalPlanned ? 'bg-red-50 dark:bg-red-900/20 border-red-100' : 'bg-green-50 dark:bg-green-900/20 border-green-100'}`}>
            <p className={`text-xs font-semibold uppercase mb-1 ${totalActual > totalPlanned ? 'text-red-700' : 'text-green-700'}`}>Réalisé</p>
            <p className={`text-xl font-black ${totalActual > totalPlanned ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(totalActual)}</p>
          </div>
          <div className={`p-4 rounded-2xl border ${variance >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100' : 'bg-red-50 dark:bg-red-900/20 border-red-100'}`}>
            <p className={`text-xs font-semibold uppercase mb-1 ${variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>Écart</p>
            <div className={`flex items-center gap-1 ${variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {variance >= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
              <p className="text-xl font-black">{formatCurrency(Math.abs(variance))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-md p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Ligne budgétaire</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Catégorie *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selectCls + ' w-full'}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Montant prévu (FCFA) *</label>
                  <input type="number" value={form.planned_amount} onChange={e => setForm(f => ({ ...f, planned_amount: e.target.value }))} className={inputCls + ' w-full'} min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Réalisé (FCFA)</label>
                  <input type="number" value={form.actual_amount} onChange={e => setForm(f => ({ ...f, actual_amount: e.target.value }))} className={inputCls + ' w-full'} min="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls + ' w-full'} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<Wallet size={24} />} title="Aucun budget défini" description={`Créez votre budget pour ${MONTHS[month - 1]} ${year}`} action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Ajouter ligne</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Prévu</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Réalisé</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Écart</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Avancement</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(b => {
                    const ecart = b.planned_amount - b.actual_amount;
                    const pct = b.planned_amount > 0 ? Math.min(100, Math.round((b.actual_amount / b.planned_amount) * 100)) : 0;
                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground capitalize">{b.category.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(b.planned_amount)}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(b.actual_amount)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {ecart >= 0 ? '-' : '+'}{formatCurrency(Math.abs(ecart))}
                        </td>
                        <td className="px-4 py-3 w-36">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDeleteId(b.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cette ligne ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
