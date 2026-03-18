'use client';
import { useEffect, useState } from 'react';
import { Plus, X, CheckCircle, Clock, Building2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Disbursement = {
  id: string; rent_amount: number; commission_rate: number; commission_amount: number;
  expenses_amount: number; net_amount: number; status: 'pending'|'paid';
  paid_date: string|null; notes: string|null; created_at: string;
  leases: { properties: { name: string }|null; tenants: { first_name: string; last_name: string }|null }|null;
};
type Lease = { id: string; rent_amount: number; properties: { name: string }|null; tenants: { first_name: string; last_name: string }|null };

export default function DisbursementsPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Disbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [commissionRate, setCommissionRate] = useState(10);
  const [expenses, setExpenses] = useState<{ amount: number; type: string; lease_id: string|null }[]>([]);
  const { page, pageSize, offset, setPage } = usePagination(20);

  const [form, setForm] = useState({
    lease_id: '', rent_amount: '', notes: '',
    commission_rate: 10, expenses_amount: 0,
  });

  const derived = {
    commission: (parseFloat(form.rent_amount) || 0) * (form.commission_rate / 100),
    net: Math.max(0, (parseFloat(form.rent_amount) || 0) - ((parseFloat(form.rent_amount) || 0) * (form.commission_rate / 100)) - form.expenses_amount),
  };

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('disbursements')
      .select('id,rent_amount,commission_rate,commission_amount,expenses_amount,net_amount,status,paid_date,notes,created_at,leases(properties(name),tenants(first_name,last_name))', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .then(({ data, count }) => {
        setItems((data || []) as unknown as Disbursement[]);
        setTotal(count || 0);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [company?.id, offset, pageSize]);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('companies').select('commission_rate').eq('id', company.id).maybeSingle()
      .then(({ data }) => {
        const rate = data?.commission_rate ?? 10;
        setCommissionRate(rate);
        setForm(f => ({ ...f, commission_rate: rate }));
      });
    sb.from('leases').select('id,rent_amount,properties(name),tenants(first_name,last_name)')
      .eq('company_id', company.id).eq('status', 'active')
      .then(({ data }) => setLeases((data || []) as unknown as Lease[]));
    sb.from('expenses').select('amount,type,lease_id').eq('company_id', company.id).eq('type', 'bailleur')
      .then(({ data }) => setExpenses((data || []) as any[]));
  }, [company?.id]);

  // Auto-fill rent and expenses when lease selected
  const onLeaseChange = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    const leaseExpenses = expenses.filter(e => e.lease_id === leaseId).reduce((s, e) => s + e.amount, 0);
    setForm(f => ({
      ...f,
      lease_id: leaseId,
      rent_amount: lease ? String(lease.rent_amount) : '',
      expenses_amount: leaseExpenses,
    }));
  };

  const save = async () => {
    if (!form.lease_id || !form.rent_amount) { toast.error('Bail et montant requis'); return; }
    setSaving(true);
    const rentAmt = parseFloat(form.rent_amount);
    const commAmt = rentAmt * (form.commission_rate / 100);
    const netAmt = Math.max(0, rentAmt - commAmt - form.expenses_amount);
    const { error } = await createClient().from('disbursements').insert({
      company_id: company!.id,
      lease_id: form.lease_id,
      rent_amount: rentAmt,
      commission_rate: form.commission_rate,
      commission_amount: commAmt,
      expenses_amount: form.expenses_amount,
      net_amount: netAmt,
      notes: form.notes || null,
      status: 'pending',
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Reversement créé');
    setShowModal(false);
    setForm({ lease_id: '', rent_amount: '', notes: '', commission_rate: commissionRate, expenses_amount: 0 });
    load();
  };

  const markPaid = async (id: string) => {
    await createClient().from('disbursements').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] } as never).eq('id', id);
    toast.success('Marqué comme payé');
    load();
  };

  const remove = async (id: string) => {
    await createClient().from('disbursements').delete().eq('id', id);
    toast.success('Supprimé'); load();
  };

  const totalPending = items.filter(i => i.status === 'pending').reduce((s, i) => s + i.net_amount, 0);
  const totalPaid = items.filter(i => i.status === 'paid').reduce((s, i) => s + i.net_amount, 0);

  return (
    <div>
      <PageHeader title="Reversements bailleurs" subtitle={`${total} reversement(s)`}
        actions={<button onClick={() => setShowModal(true)} className={btnPrimary}><Plus size={16}/> Nouveau reversement</button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Clock size={12}/> En attente</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-amber-600 mt-1">{items.filter(i => i.status==='pending').length} reversement(s)</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1 flex items-center gap-1"><CheckCircle size={12}/> Payés</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-green-600 mt-1">{items.filter(i => i.status==='paid').length} reversement(s)</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Total reversé</p>
          <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalPending + totalPaid)}</p>
        </div>
      </div>

      {/* List */}
      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
        : items.length === 0
          ? <EmptyState icon={<Building2 size={24}/>} title="Aucun reversement"
              action={<button onClick={() => setShowModal(true)} className={btnPrimary}><Plus size={16}/>Créer</button>}/>
          : (
            <div className={cardCls}>
              <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px_100px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Bien / Locataire</span><span>Loyer</span><span>Commission</span><span>Dépenses</span><span>Net à reverser</span><span className="text-right">Statut</span>
              </div>
              <div className="divide-y divide-border">
                {items.map(d => (
                  <div key={d.id} className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_100px_120px_100px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{d.leases?.tenants?.first_name} {d.leases?.tenants?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{d.leases?.properties?.name} · {formatDate(d.created_at)}</p>
                      {d.notes && <p className="text-xs text-muted-foreground italic">{d.notes}</p>}
                    </div>
                    <span className="text-sm text-foreground">{formatCurrency(d.rent_amount)}</span>
                    <span className="text-sm text-blue-600">-{formatCurrency(d.commission_amount)} <span className="text-xs text-muted-foreground">({d.commission_rate}%)</span></span>
                    <span className="text-sm text-orange-600">-{formatCurrency(d.expenses_amount)}</span>
                    <span className="text-sm font-bold text-purple-700">{formatCurrency(d.net_amount)}</span>
                    <div className="flex items-center justify-end gap-1">
                      {d.status === 'pending' ? (
                        <button onClick={() => markPaid(d.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold rounded-lg transition-colors">
                          <CheckCircle size={11}/> Payer
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 text-xs font-semibold rounded-lg">
                          <CheckCircle size={11}/> Payé
                        </span>
                      )}
                      <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors ml-1">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
            </div>
          )
      }

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cardCls + ' w-full max-w-lg'}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2"><Building2 size={18} className="text-primary"/><h3 className="font-semibold text-foreground">Nouveau reversement</h3></div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Bail / Locataire *</label>
                <select value={form.lease_id} onChange={e => onLeaseChange(e.target.value)} className={selectCls + ' w-full'}>
                  <option value="">— Choisir un bail —</option>
                  {leases.map(l => <option key={l.id} value={l.id}>{l.tenants?.first_name} {l.tenants?.last_name} — {l.properties?.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Montant loyer (FCFA) *</label>
                  <input type="number" value={form.rent_amount} onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))} placeholder="0" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Taux commission (%)</label>
                  <input type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: parseFloat(e.target.value)||0 }))} className={inputCls}/>
                </div>
              </div>
              <div>
                <label className={labelCls}>Dépenses bailleur liées (FCFA)</label>
                <input type="number" value={form.expenses_amount} onChange={e => setForm(f => ({ ...f, expenses_amount: parseFloat(e.target.value)||0 }))} placeholder="0" className={inputCls}/>
                <p className="text-xs text-muted-foreground mt-1">Auto-calculé depuis les dépenses bailleur enregistrées pour ce bail</p>
              </div>
              {/* Calcul preview */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Loyer</span><span className="font-medium">{formatCurrency(parseFloat(form.rent_amount)||0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commission ({form.commission_rate}%)</span><span className="text-blue-600">-{formatCurrency(derived.commission)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dépenses bailleur</span><span className="text-orange-600">-{formatCurrency(form.expenses_amount)}</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold text-foreground">Net à reverser</span><span className="font-bold text-purple-700">{formatCurrency(derived.net)}</span></div>
              </div>
              <div>
                <label className={labelCls}>Notes (optionnel)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Reversement mars 2026" className={inputCls}/>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-700/20 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className={btnSecondary}>Annuler</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>
                {saving ? <LoadingSpinner size={15}/> : <Plus size={15}/>}{saving ? 'Enregistrement...' : 'Créer le reversement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}