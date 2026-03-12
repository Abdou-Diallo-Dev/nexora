'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileDown, CreditCard, Filter, Pencil, Trash2, X, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import {
  PageHeader, Badge, LoadingSpinner, EmptyState, Pagination,
  inputCls, selectCls, btnPrimary, cardCls, BadgeVariant,
} from '@/components/ui';
import { formatDate, formatCurrency, formatMonth } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { generateReceiptPDF } from '@/lib/pdf';
import { toast } from 'sonner';

type Payment = {
  id: string; amount: number; charges_amount: number; period_month: number; period_year: number;
  paid_date: string | null; due_date: string | null; status: string; payment_method: string;
  reference: string | null;
  leases: { start_date: string; tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null; properties: { name: string; address: string; city: string; type: string } | null } | null;
};

type EditForm = {
  amount: string; charges_amount: string; status: string;
  payment_method: string; paid_date: string; reference: string;
};

const STATUS: Record<string,{l:string;v:BadgeVariant}> = {
  paid:    { l:'Payé',       v:'success' },
  pending: { l:'En attente', v:'warning' },
  late:    { l:'En retard',  v:'error'   },
  partial: { l:'Partiel',    v:'warning' },
  overdue: { l:'Impayé',     v:'error'   },
};
const METHOD: Record<string,string> = {
  cash:'Espèces', bank_transfer:'Virement', wave:'Wave',
  orange_money:'Orange Money', free_money:'Free Money', check:'Chèque',
};

export default function PaymentsPage() {
  const { company, user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'manager';

  const [items, setItems]               = useState<Payment[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [editItem, setEditItem]         = useState<Payment | null>(null);
  const [editForm, setEditForm]         = useState<EditForm | null>(null);
  const [saving, setSaving]             = useState(false);

  const [deleteItem, setDeleteItem]     = useState<Payment | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient()
      .from('rent_payments')
      .select('*,leases(start_date,tenants(first_name,last_name,email,phone),properties(name,address,city,type))', { count: 'exact' })
      .eq('company_id', company.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(({ data, count }) => {
      setItems(data as unknown as Payment[] || []);
      setTotal(count || 0);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [company?.id, debounced, filterStatus, offset, pageSize]);

  /* ── PDF ── */
  const handleGeneratePDF = async (p: Payment) => {
    const tenant = p.leases?.tenants;
    const prop   = p.leases?.properties;
    if (!tenant || !prop) { toast.error('Données incomplètes'); return; }
    setGeneratingId(p.id);
    try {
      await generateReceiptPDF({
        reference:       p.reference ?? `QUITT-${p.period_year}${String(p.period_month).padStart(2,'0')}`,
        tenantName:      `${tenant.first_name} ${tenant.last_name}`,
        tenantPhone:     tenant.phone    ?? undefined,
        tenantEmail:     tenant.email,
        propertyName:    prop.name,
        propertyAddress: prop.address,
        propertyCity:    prop.city,
        propertyType:    prop.type,
        periodMonth:     p.period_month,
        periodYear:      p.period_year,
        amount:          Number(p.amount) || 0,
        chargesAmount:   Number(p.charges_amount) || 0,
        paidDate:        p.paid_date     ?? undefined,
        paymentMethod:   p.payment_method,
        status:          p.status,
        companyName:     company?.name   || 'Nexora',
        companyAddress:  (company as any)?.address || undefined,
        companyPhone:    (company as any)?.phone   || undefined,
        companyEmail:    (company as any)?.email   || undefined,
        companyLogoUrl:  company?.logo_url || null,
        primaryColor:    (company as any)?.primary_color || null,
        prorataStartDay: p.leases?.start_date ? (() => {
          const startDate = new Date(p.leases!.start_date);
          const isFirstMonth = startDate.getFullYear() === p.period_year && (startDate.getMonth() + 1) === p.period_month;
          return isFirstMonth ? startDate.getDate() : undefined;
        })() : undefined,
      });
      toast.success('Quittance téléchargée');
    } catch { toast.error('Erreur génération PDF'); }
    setGeneratingId(null);
  };

  /* ── EDIT ── */
  const openEdit = (p: Payment) => {
    setEditItem(p);
    setEditForm({
      amount:         String(p.amount),
      charges_amount: String(p.charges_amount),
      status:         p.status,
      payment_method: p.payment_method,
      paid_date:      p.paid_date ? p.paid_date.slice(0, 10) : '',
      reference:      p.reference || '',
    });
  };

  const handleSave = async () => {
    if (!editItem || !editForm) return;
    setSaving(true);
    const { error } = await createClient()
      .from('rent_payments')
      .update({
        amount:         parseFloat(editForm.amount)         || 0,
        charges_amount: parseFloat(editForm.charges_amount) || 0,
        status:         editForm.status,
        payment_method: editForm.payment_method,
        paid_date:      editForm.paid_date || null,
        reference:      editForm.reference || null,
      })
      .eq('id', editItem.id);
    setSaving(false);
    if (error) { toast.error('Erreur lors de la modification'); return; }
    toast.success('Paiement modifié');
    setEditItem(null); setEditForm(null);
    load();
  };

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    const { error } = await createClient()
      .from('rent_payments')
      .delete()
      .eq('id', deleteItem.id);
    setDeleting(false);
    if (error) { toast.error('Erreur lors de la suppression'); return; }
    toast.success('Quittance supprimée');
    setDeleteItem(null);
    load();
  };

  const colGrid = isAdmin
    ? 'grid-cols-1 md:grid-cols-[1fr_1fr_100px_110px_90px_120px]'
    : 'grid-cols-1 md:grid-cols-[1fr_1fr_100px_110px_90px_100px]';

  return (
    <div>
      <PageHeader
        title="Paiements de loyers"
        subtitle={`${total} paiement(s)`}
        actions={
          <Link href="/real-estate/payments/new" className={btnPrimary}>
            <Plus size={16} />Enregistrer
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls + ' pl-9'} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-40'}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS).map(([v,{l}]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
        : items.length === 0
          ? <EmptyState icon={<CreditCard size={24} />} title="Aucun paiement"
              action={<Link href="/real-estate/payments/new" className={btnPrimary}><Plus size={16} />Enregistrer</Link>} />
          : (
            <div className={cardCls}>
              <div className={`hidden md:grid ${colGrid} gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider`}>
                <span>Locataire / Bien</span><span>Période</span><span>Montant</span>
                <span>Méthode</span><span>Statut</span>
                <span className="text-right">{isAdmin ? 'Actions' : 'Quittance'}</span>
              </div>

              <div className="divide-y divide-border">
                {items.map(p => {
                  const tenant = p.leases?.tenants;
                  const prop   = p.leases?.properties;
                  const st = STATUS[p.status] || { l: p.status, v: 'default' as BadgeVariant };
                  return (
                    <div key={p.id} className={`grid ${colGrid} gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors`}>
                      <div>
                        <p className="font-medium text-foreground text-sm">{tenant ? `${tenant.first_name} ${tenant.last_name}` : '—'}</p>
                        <p className="text-xs text-muted-foreground">{prop?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{formatMonth(p.period_month, p.period_year)}</p>
                        {p.paid_date && <p className="text-xs text-muted-foreground">Payé le {formatDate(p.paid_date)}</p>}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{formatCurrency(p.amount)}</p>
                        {p.charges_amount > 0 && <p className="text-xs text-muted-foreground">+{formatCurrency(p.charges_amount)}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">{METHOD[p.payment_method] || p.payment_method}</span>
                      <Badge variant={st.v}>{st.l}</Badge>

                      <div className="flex items-center gap-1.5 md:justify-end">
                        <button
                          onClick={() => handleGeneratePDF(p)}
                          disabled={generatingId === p.id}
                          title="Télécharger la quittance PDF"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          {generatingId === p.id ? <LoadingSpinner size={12} /> : <FileDown size={13} />}
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => openEdit(p)}
                            title="Modifier"
                            className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => setDeleteItem(p)}
                            title="Supprimer"
                            className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          )}

      {/* ── MODAL MODIFIER ── */}
      {editItem && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">Modifier le paiement</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editItem.leases?.tenants
                    ? `${editItem.leases.tenants.first_name} ${editItem.leases.tenants.last_name}`
                    : ''} — {formatMonth(editItem.period_month, editItem.period_year)}
                </p>
              </div>
              <button onClick={() => { setEditItem(null); setEditForm(null); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Loyer (F CFA)</label>
                  <input type="number" value={editForm.amount}
                    onChange={e => setEditForm({...editForm, amount: e.target.value})}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Charges (F CFA)</label>
                  <input type="number" value={editForm.charges_amount}
                    onChange={e => setEditForm({...editForm, charges_amount: e.target.value})}
                    className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Statut</label>
                  <select value={editForm.status}
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                    className={selectCls}>
                    {Object.entries(STATUS).map(([v,{l}]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Méthode</label>
                  <select value={editForm.payment_method}
                    onChange={e => setEditForm({...editForm, payment_method: e.target.value})}
                    className={selectCls}>
                    {Object.entries(METHOD).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date de paiement</label>
                  <input type="date" value={editForm.paid_date}
                    onChange={e => setEditForm({...editForm, paid_date: e.target.value})}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Référence</label>
                  <input type="text" value={editForm.reference}
                    onChange={e => setEditForm({...editForm, reference: e.target.value})}
                    placeholder="QUITT-..." className={inputCls} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => { setEditItem(null); setEditForm(null); }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? <LoadingSpinner size={14} /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SUPPRIMER ── */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Supprimer la quittance</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Cette action est irréversible</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
                Vous allez supprimer le paiement de{' '}
                <span className="font-semibold text-foreground">
                  {deleteItem.leases?.tenants
                    ? `${deleteItem.leases.tenants.first_name} ${deleteItem.leases.tenants.last_name}`
                    : '—'}
                </span>{' '}
                pour la période{' '}
                <span className="font-semibold text-foreground">
                  {formatMonth(deleteItem.period_month, deleteItem.period_year)}
                </span>{' '}
                ({formatCurrency(deleteItem.amount)}).
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setDeleteItem(null)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleting ? <LoadingSpinner size={14} /> : <Trash2 size={14} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}