'use client';
import { useEffect, useState } from 'react';
import { Plus, AlertTriangle, CheckCircle, Trash2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Debt = {
  id: string; client_id: string | null; client_name: string; amount_owed: number;
  amount_paid: number; description: string | null; due_date: string | null;
  status: string; reference: string | null;
};

const STATUS_MAP: Record<string, { l: string; v: BadgeVariant }> = {
  pending:     { l: 'En attente', v: 'warning' },
  partial:     { l: 'Partiel',   v: 'info'    },
  paid:        { l: 'Payé',      v: 'success' },
  overdue:     { l: 'En retard', v: 'error'   },
  cancelled:   { l: 'Annulé',   v: 'default' },
};

export default function DettesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Debt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_name: '', amount_owed: '', description: '', due_date: '', reference: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('client_debts')
      .select('*', { count: 'exact' })
      .eq('company_id', company.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(({ data, count }) => { setItems((data || []) as any); setTotal(count || 0); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, filterStatus, offset]);

  const handleSave = async () => {
    if (!form.client_name || !form.amount_owed) { toast.error('Client et montant requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('client_debts').insert({
      company_id: company!.id, client_name: form.client_name,
      amount_owed: Number(form.amount_owed), amount_paid: 0,
      description: form.description || null, due_date: form.due_date || null,
      reference: form.reference || null, status: 'pending',
    });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Dette enregistrée');
    setShowForm(false);
    setForm({ client_name: '', amount_owed: '', description: '', due_date: '', reference: '' });
    load();
  };

  const handlePayment = async () => {
    if (!showPayment || !paymentAmount) { toast.error('Montant requis'); return; }
    setSaving(true);
    const debt = items.find(d => d.id === showPayment);
    if (!debt) { setSaving(false); return; }
    const newPaid = debt.amount_paid + Number(paymentAmount);
    const remaining = debt.amount_owed - newPaid;
    const newStatus = remaining <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
    await createClient().from('client_debts').update({ amount_paid: newPaid, status: newStatus }).eq('id', showPayment);
    setSaving(false);
    toast.success('Paiement enregistré');
    setShowPayment(null);
    setPaymentAmount('');
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('client_debts').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const totalOwed = items.reduce((s, d) => s + Number(d.amount_owed), 0);
  const totalPaid = items.reduce((s, d) => s + Number(d.amount_paid), 0);
  const totalRemaining = totalOwed - totalPaid;

  return (
    <div>
      <PageHeader title="Dettes clients"
        subtitle={`${total} dossier(s) · Reste à encaisser: ${formatCurrency(totalRemaining)}`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Enregistrer dette</button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100">
          <p className="text-xs font-semibold text-red-700 uppercase mb-1">Total dû</p>
          <p className="text-xl font-black text-red-700">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100">
          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Encaissé</p>
          <p className="text-xl font-black text-green-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Restant</p>
          <p className="text-xl font-black text-amber-700">{formatCurrency(totalRemaining)}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-44'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-md p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Enregistrer une dette</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nom du client *</label>
                <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Montant dû (FCFA) *</label>
                  <input type="number" value={form.amount_owed} onChange={e => setForm(f => ({ ...f, amount_owed: e.target.value }))} className={inputCls + ' w-full'} min="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Échéance</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls + ' w-full'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Référence</label>
                <input type="text" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className={inputCls + ' w-full'} placeholder="N° facture, bon de commande..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls + ' w-full'} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-sm p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Enregistrer un paiement</h3>
            {(() => {
              const debt = items.find(d => d.id === showPayment);
              return debt ? (
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="font-medium text-sm text-foreground">{debt.client_name}</p>
                  <p className="text-xs text-muted-foreground">Restant: {formatCurrency(debt.amount_owed - debt.amount_paid)}</p>
                </div>
              ) : null;
            })()}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Montant reçu (FCFA) *</label>
              <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className={inputCls + ' w-full'} min="0" autoFocus />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowPayment(null); setPaymentAmount(''); }} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handlePayment} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<AlertTriangle size={24} />} title="Aucune dette enregistrée" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Enregistrer</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Client</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Référence</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Dû</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Payé</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Restant</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Échéance</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(d => {
                    const sm = STATUS_MAP[d.status] || { l: d.status, v: 'default' as BadgeVariant };
                    const remaining = d.amount_owed - d.amount_paid;
                    const isOverdue = d.due_date && d.status !== 'paid' && new Date(d.due_date) < new Date();
                    return (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{d.client_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.reference || '—'}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatCurrency(d.amount_owed)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(d.amount_paid)}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(remaining)}</td>
                        <td className="px-4 py-3">
                          {d.due_date ? (
                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {isOverdue && <AlertTriangle size={11} className="inline mr-1" />}
                              {formatDate(d.due_date)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3"><Badge variant={sm.v}>{sm.l}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {d.status !== 'paid' && (
                              <button onClick={() => setShowPayment(d.id)} title="Enregistrer paiement" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle size={14} /></button>
                            )}
                            <button onClick={() => setDeleteId(d.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
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

      <ConfirmDialog open={!!deleteId} title="Supprimer ce dossier ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
