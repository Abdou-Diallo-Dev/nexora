'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

type LeaseRow = { id: string; rent_amount: number; payment_day: number; tenants: { first_name: string; last_name: string } | null; properties: { name: string } | null };

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function NewPaymentPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const now = new Date();
  const [form, setForm] = useState({
    lease_id: '',
    amount: '',
    charges_amount: '0',
    period_month: String(now.getMonth() + 1),
    period_year: String(now.getFullYear()),
    paid_date: now.toISOString().slice(0, 10),
    due_date: now.toISOString().slice(0, 10),
    status: 'paid',
    payment_method: 'cash',
    reference: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const makeDueDate = (month: string, year: string, day: number) => {
    const d = String(Math.min(day || 1, 28)).padStart(2, '0');
    const m = String(Number(month)).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  useEffect(() => {
    if (!company?.id) return;
    createClient()
      .from('leases')
      .select('id,rent_amount,payment_day,tenants(first_name,last_name),properties(name)')
      .eq('company_id', company.id)
      .eq('status', 'active')
      .then(({ data }) => {
        const rows = (data || []) as unknown as LeaseRow[];
        setLeases(rows);
        if (rows[0]) {
          const due = makeDueDate(form.period_month, form.period_year, rows[0].payment_day);
          setForm(f => ({ ...f, lease_id: rows[0].id, amount: String(rows[0].rent_amount), due_date: due }));
        }
      });
  }, [company?.id]);

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return;
    const due = makeDueDate(form.period_month, form.period_year, lease.payment_day);
    setForm(f => ({ ...f, lease_id: leaseId, amount: String(lease.rent_amount), due_date: due }));
  };

  const handlePeriod = (key: 'period_month' | 'period_year', val: string) => {
    const month = key === 'period_month' ? val : form.period_month;
    const year  = key === 'period_year'  ? val : form.period_year;
    const lease = leases.find(l => l.id === form.lease_id);
    const due = makeDueDate(month, year, lease?.payment_day || 1);
    setForm(f => ({ ...f, [key]: val, due_date: due }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id || !form.lease_id) { toast.error('Veuillez sélectionner un bail'); return; }
    setLoading(true);
    const sb = createClient();

    // Get lease details for tenant_id
    const lease = leases.find(l => l.id === form.lease_id);
    const { data: leaseData } = await sb.from('leases').select('tenant_id').eq('id', form.lease_id).maybeSingle();
    const tenantId = (leaseData as any)?.tenant_id;

    // Block duplicate: check if paid payment already exists for this lease + period
    if (form.status === 'paid') {
      const { data: existing } = await sb.from('rent_payments')
        .select('id,status')
        .eq('lease_id', form.lease_id)
        .eq('period_month', Number(form.period_month))
        .eq('period_year', Number(form.period_year))
        .eq('status', 'paid')
        .maybeSingle();
      if (existing) {
        toast.error(`❌ Un paiement payé existe déjà pour ${lease?.tenants?.first_name} ${lease?.tenants?.last_name} en ${form.period_month}/${form.period_year}`);
        setLoading(false);
        return;
      }
      // If pending exists, update it instead of inserting
      const { data: pending } = await sb.from('rent_payments')
        .select('id')
        .eq('lease_id', form.lease_id)
        .eq('period_month', Number(form.period_month))
        .eq('period_year', Number(form.period_year))
        .in('status', ['pending', 'late', 'overdue'])
        .maybeSingle();
      if (pending) {
        const { error } = await sb.from('rent_payments').update({
          status: 'paid',
          amount: Number(form.amount),
          paid_date: form.paid_date,
          payment_method: form.payment_method,
          notes: form.notes || null,
        }).eq('id', (pending as any).id);
        setLoading(false);
        if (error) { toast.error(error.message); return; }
        qc.bust('re-');
        toast.success('✅ Paiement mis à jour — marqué comme payé !');
        router.push('/real-estate/payments');
        return;
      }
    }

    const { error } = await sb.from('rent_payments').insert({
      company_id:     company.id,
      lease_id:       form.lease_id,
      tenant_id:      tenantId || null,
      amount:         Number(form.amount),
      charges_amount: Number(form.charges_amount),
      period_month:   Number(form.period_month),
      period_year:    Number(form.period_year),
      due_date:       form.due_date,
      paid_date:      form.status === 'paid' ? form.paid_date : null,
      status:         form.status,
      payment_method: form.payment_method,
      reference:      form.reference || null,
      notes:          form.notes     || null,
    } as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-');
    toast.success('✅ Paiement enregistré avec succès !');
    router.push('/real-estate/payments');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/payments" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Enregistrer un paiement" />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="md:col-span-2">
            <label className={labelCls}>Bail *</label>
            <select value={form.lease_id} onChange={e => handleLeaseChange(e.target.value)} required className={selectCls}>
              <option value="">Sélectionner un bail...</option>
              {leases.map(l => (
                <option key={l.id} value={l.id}>
                  {l.tenants?.first_name} {l.tenants?.last_name} — {l.properties?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Montant (FCFA) *</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Charges (FCFA)</label>
            <input type="number" value={form.charges_amount} onChange={e => set('charges_amount', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Mois *</label>
            <select value={form.period_month} onChange={e => handlePeriod('period_month', e.target.value)} className={selectCls}>
              {MONTHS.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Année *</label>
            <input type="number" min="2020" max="2099" value={form.period_year} onChange={e => handlePeriod('period_year', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Date d&apos;échéance *</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Date de paiement</label>
            <input type="date" value={form.paid_date} onChange={e => set('paid_date', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Méthode de paiement</label>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={selectCls}>
              {[['cash','Espèces'],['bank_transfer','Virement bancaire'],['wave','Wave'],['orange_money','Orange Money'],['free_money','Free Money'],['check','Chèque']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
              {[['paid','Payé'],['pending','En attente'],['partial','Partiel'],['late','En retard']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Référence / Reçu</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Ex: REF-2026-001" className={inputCls} />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/payments" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? <LoadingSpinner size={16} /> : <Save size={16} />}Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}