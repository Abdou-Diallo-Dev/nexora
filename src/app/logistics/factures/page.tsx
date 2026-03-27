'use client';
import { useEffect, useState } from 'react';
import { Plus, FileText, Printer, Trash2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Invoice = {
  id: string; invoice_number: string; client_id: string | null; client_name: string;
  client_address: string | null; client_phone: string | null;
  issue_date: string; due_date: string | null; status: string;
  subtotal: number; tax_amount: number; total_amount: number;
  notes: string | null; payment_date: string | null;
};

type InvoiceItem = { description: string; quantity: number; unit_price: number; total: number };

const STATUS_MAP: Record<string, { l: string; v: BadgeVariant }> = {
  draft:     { l: 'Brouillon', v: 'default' },
  sent:      { l: 'Envoyée',   v: 'info'    },
  paid:      { l: 'Payée',     v: 'success' },
  overdue:   { l: 'En retard', v: 'error'   },
  cancelled: { l: 'Annulée',   v: 'default' },
};

export default function FacturesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: '', client_address: '', client_phone: '',
    issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '', tax_rate: '18',
  });
  const [lines, setLines] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('logistics_invoices')
      .select('id,invoice_number,client_name,client_address,client_phone,issue_date,due_date,status,subtotal,tax_amount,total_amount,notes,payment_date', { count: 'exact' })
      .eq('company_id', company.id)
      .order('issue_date', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(({ data, count }) => { setItems((data || []) as any); setTotal(count || 0); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, filterStatus, offset]);

  const updateLine = (i: number, field: keyof InvoiceItem, val: string | number) => {
    setLines(ls => ls.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [field]: field === 'description' ? val : Number(val) };
      updated.total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const taxRate = Number(form.tax_rate) || 0;
  const taxAmount = Math.round(subtotal * taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSave = async () => {
    if (!form.client_name) { toast.error('Nom client requis'); return; }
    if (lines.some(l => !l.description)) { toast.error('Description requise pour toutes les lignes'); return; }
    setSaving(true);
    const sb = createClient();
    const { data: inv, error } = await sb.from('logistics_invoices').insert({
      company_id: company!.id, client_name: form.client_name,
      client_address: form.client_address || null, client_phone: form.client_phone || null,
      issue_date: form.issue_date, due_date: form.due_date || null,
      status: 'draft', subtotal, tax_rate: taxRate, tax_amount: taxAmount,
      total_amount: totalAmount, notes: form.notes || null,
    }).select('id').single();
    if (!error && inv) {
      await sb.from('logistics_invoice_items').insert(lines.map(l => ({
        invoice_id: inv.id, description: l.description, quantity: l.quantity,
        unit_price: l.unit_price, total: l.total,
      })));
    }
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Facture créée');
    setShowForm(false);
    setForm({ client_name: '', client_address: '', client_phone: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '', tax_rate: '18' });
    setLines([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    load();
  };

  const handleMarkPaid = async (id: string) => {
    await createClient().from('logistics_invoices').update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] }).eq('id', id);
    toast.success('Facture marquée comme payée');
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('logistics_invoices').delete().eq('id', deleteId);
    toast.success('Supprimée');
    setDeleteId(null); setDeleting(false); load();
  };

  const totalRevenue = items.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPending = items.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div>
      <PageHeader title="Factures" subtitle={`${total} facture(s) · Encaissé: ${formatCurrency(totalRevenue)}`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Nouvelle facture</button>}
      />

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100">
          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Encaissé</p>
          <p className="text-xl font-black text-green-700">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase mb-1">En attente</p>
          <p className="text-xl font-black text-amber-700">{formatCurrency(totalPending)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Total émis</p>
          <p className="text-xl font-black text-blue-700">{items.length} facture(s)</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-44'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto'}>
            <h3 className="font-bold text-lg text-foreground">Nouvelle facture</h3>

            {/* Client info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Client *</label>
                <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={inputCls + ' w-full'} placeholder="Nom du client ou société" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Adresse</label>
                <input type="text" value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Téléphone</label>
                <input type="tel" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date émission</label>
                <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Échéance</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">TVA (%)</label>
                <input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} className={inputCls + ' w-full'} min="0" max="100" />
              </div>
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground">Lignes</label>
                <button onClick={() => setLines(ls => [...ls, { description: '', quantity: 1, unit_price: 0, total: 0 }])}
                  className="text-xs text-primary hover:underline">+ Ajouter ligne</button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)}
                      className={inputCls + ' col-span-5'} placeholder="Description" />
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
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Sous-total HT</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>TVA ({form.tax_rate}%)</span><span>{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between font-black text-foreground text-base"><span>Total TTC</span><span>{formatCurrency(totalAmount)}</span></div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls + ' w-full'} rows={2} />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Créer facture'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<FileText size={24} />} title="Aucune facture" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Créer facture</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">N°</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Client</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Émission</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Échéance</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Total TTC</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(inv => {
                    const sm = STATUS_MAP[inv.status] || { l: inv.status, v: 'default' as BadgeVariant };
                    const isOverdue = inv.due_date && inv.status !== 'paid' && new Date(inv.due_date) < new Date();
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.invoice_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{inv.client_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issue_date)}</td>
                        <td className="px-4 py-3">
                          {inv.due_date ? (
                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {formatDate(inv.due_date)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(inv.total_amount)}</td>
                        <td className="px-4 py-3"><Badge variant={sm.v}>{sm.l}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <button onClick={() => handleMarkPaid(inv.id)} title="Marquer payée" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle size={14} /></button>
                            )}
                            <button onClick={() => setDeleteId(inv.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-border">
                <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
              </div>
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cette facture ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
