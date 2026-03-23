'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Split } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';
import { formatCurrency } from '@/lib/utils';

type LeaseRow = { id: string; rent_amount: number; payment_day: number; tenants: { first_name: string; last_name: string } | null; properties: { name: string } | null };

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function NewPaymentPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [isPartial, setIsPartial] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    lease_id: '',
    amount: '',           // loyer total attendu
    paid_amount: '',      // montant versé (si partiel)
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

  const totalAmount = parseFloat(form.amount) || 0;
  const paidAmount = isPartial ? (parseFloat(form.paid_amount) || 0) : totalAmount;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const autoStatus = isPartial && paidAmount < totalAmount && paidAmount > 0 ? 'partial' : form.status;

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
          setForm(f => ({ ...f, lease_id: rows[0].id, amount: String(rows[0].rent_amount), paid_amount: String(rows[0].rent_amount), due_date: due }));
        }
      });
  }, [company?.id]);

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return;
    const due = makeDueDate(form.period_month, form.period_year, lease.payment_day);
    setForm(f => ({ ...f, lease_id: leaseId, amount: String(lease.rent_amount), paid_amount: String(lease.rent_amount), due_date: due }));
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
    if (isPartial && paidAmount <= 0) { toast.error('Montant versé invalide'); return; }
    setLoading(true);
    const sb = createClient();

    // Get tenant_id from lease
    const { data: leaseData } = await sb.from('leases').select('tenant_id').eq('id', form.lease_id).maybeSingle();
    const tenantId = (leaseData as any)?.tenant_id;

    // Block duplicate paid payment
    if (autoStatus === 'paid') {
      const { data: existing } = await sb.from('rent_payments')
        .select('id,status').eq('lease_id', form.lease_id)
        .eq('period_month', Number(form.period_month))
        .eq('period_year', Number(form.period_year))
        .eq('status', 'paid').maybeSingle();
      if (existing) {
        const lease = leases.find(l => l.id === form.lease_id);
        toast.error(`Un paiement complet existe déjà pour ${lease?.tenants?.first_name} ${lease?.tenants?.last_name} en ${form.period_month}/${form.period_year}`);
        setLoading(false); return;
      }
    }

    // Check if partial payment exists for same period — update it
    const { data: existingPartial } = await sb.from('rent_payments')
      .select('id,paid_amount,total_amount').eq('lease_id', form.lease_id)
      .eq('period_month', Number(form.period_month))
      .eq('period_year', Number(form.period_year))
      .eq('status', 'partial').maybeSingle();

    if (existingPartial && isPartial) {
      // Add to existing partial payment
      const newPaid = Number((existingPartial as any).paid_amount) + paidAmount;
      const total = Number((existingPartial as any).total_amount) || totalAmount;
      const newRemaining = Math.max(0, total - newPaid);
      const newStatus = newRemaining <= 0 ? 'paid' : 'partial';
      await sb.from('rent_payments').update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        status: newStatus,
        paid_date: newStatus === 'paid' ? form.paid_date : null,
        notes: form.notes || null,
      }).eq('id', (existingPartial as any).id);
      setLoading(false);
      qc.bust('re-');
      toast.success(newStatus === 'paid' ? '✅ Paiement complet !' : `✅ Versement ajouté — Reste : ${formatCurrency(newRemaining)}`);
      router.push('/real-estate/payments');
      return;
    }

    // New payment
    const { error } = await sb.from('rent_payments').insert({
      company_id:       company.id,
      lease_id:         form.lease_id,
      tenant_id:        tenantId || null,
      amount:           isPartial ? paidAmount : totalAmount,
      total_amount:     totalAmount,
      paid_amount:      paidAmount,
      remaining_amount: remainingAmount,
      is_partial:       isPartial && remainingAmount > 0,
      charges_amount:   Number(form.charges_amount),
      period_month:     Number(form.period_month),
      period_year:      Number(form.period_year),
      due_date:         form.due_date,
      paid_date:        autoStatus === 'paid' ? form.paid_date : null,
      status:           autoStatus,
      payment_method:   form.payment_method,
      reference:        form.reference || null,
      notes:            form.notes || null,
    } as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-');
    if (isPartial && remainingAmount > 0) {
      toast.success(`✅ Versement partiel enregistré — Reste à payer : ${formatCurrency(remainingAmount)}`);
    } else {
      toast.success('✅ Paiement enregistré avec succès !');
    }
    router.push('/real-estate/payments');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/payments" className={btnSecondary+' !px-3'}><ArrowLeft size={16}/></Link>
        <PageHeader title="Enregistrer un paiement"/>
      </div>
      <form onSubmit={submit} className={cardCls+' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Bail */}
          <div className="md:col-span-2">
            <label className={labelCls}>Bail *</label>
            <select value={form.lease_id} onChange={e=>handleLeaseChange(e.target.value)} required className={selectCls}>
              <option value="">Sélectionner un bail...</option>
              {leases.map(l=>(
                <option key={l.id} value={l.id}>
                  {l.tenants?.first_name} {l.tenants?.last_name} — {l.properties?.name} ({formatCurrency(l.rent_amount)}/mois)
                </option>
              ))}
            </select>
          </div>

          {/* Période */}
          <div>
            <label className={labelCls}>Mois *</label>
            <select value={form.period_month} onChange={e=>handlePeriod('period_month',e.target.value)} className={selectCls}>
              {MONTHS.map((m,i)=><option key={i+1} value={String(i+1)}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Année *</label>
            <select value={form.period_year} onChange={e=>handlePeriod('period_year',e.target.value)} className={selectCls}>
              {[2023,2024,2025,2026,2027].map(y=><option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>

          {/* Montant loyer total */}
          <div>
            <label className={labelCls}>Montant loyer total (FCFA) *</label>
            <input type="number" value={form.amount} onChange={e=>{ set('amount',e.target.value); if(!isPartial) set('paid_amount',e.target.value); }} required className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Charges (FCFA)</label>
            <input type="number" value={form.charges_amount} onChange={e=>set('charges_amount',e.target.value)} className={inputCls}/>
          </div>

          {/* Toggle paiement partiel */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
              <Split size={18} className="text-amber-600 flex-shrink-0"/>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Paiement fractionné</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Le locataire paie en plusieurs versements</p>
              </div>
              <button type="button" onClick={()=>setIsPartial(v=>!v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isPartial?'bg-amber-500':'bg-slate-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPartial?'translate-x-5':''}`}/>
              </button>
            </div>
          </div>

          {/* Si partiel */}
          {isPartial && (
            <>
              <div>
                <label className={labelCls}>Montant versé ce jour (FCFA) *</label>
                <input type="number" value={form.paid_amount} onChange={e=>set('paid_amount',e.target.value)} required className={inputCls}/>
              </div>
              <div>
                <div className={`p-3 rounded-xl ${remainingAmount > 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Reste à payer</p>
                  <p className={`text-xl font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Statut : <strong>{remainingAmount <= 0 ? '✅ Payé intégralement' : '⚠️ Partiellement payé'}</strong>
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Date + mode */}
          <div>
            <label className={labelCls}>Date de paiement</label>
            <input type="date" value={form.paid_date} onChange={e=>set('paid_date',e.target.value)} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Mode de paiement</label>
            <select value={form.payment_method} onChange={e=>set('payment_method',e.target.value)} className={selectCls}>
              <option value="cash">💵 Espèces</option>
              <option value="wave">📱 Wave</option>
              <option value="orange_money">🟠 Orange Money</option>
              <option value="free_money">🟣 Free Money</option>
              <option value="bank_transfer">🏦 Virement</option>
              <option value="check">📝 Chèque</option>
            </select>
          </div>

          {!isPartial && (
            <div>
              <label className={labelCls}>Statut</label>
              <select value={form.status} onChange={e=>set('status',e.target.value)} className={selectCls}>
                <option value="paid">✅ Payé</option>
                <option value="pending">⏳ En attente</option>
                <option value="late">⚠️ En retard</option>
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Référence</label>
            <input value={form.reference} onChange={e=>set('reference',e.target.value)} placeholder="N° reçu, transaction..." className={inputCls}/>
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} className={inputCls+' resize-none w-full'}/>
          </div>
        </div>

        {/* Résumé */}
        {totalAmount > 0 && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-muted-foreground">Loyer total</p><p className="font-bold text-foreground">{formatCurrency(totalAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Versé</p><p className="font-bold text-green-600">{formatCurrency(paidAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Reste</p><p className={`font-bold ${remainingAmount>0?'text-red-600':'text-green-600'}`}>{formatCurrency(remainingAmount)}</p></div>
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/payments" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading?<LoadingSpinner size={16}/>:<Save size={16}/>}
            {isPartial && remainingAmount > 0 ? 'Enregistrer le versement' : 'Enregistrer le paiement'}
          </button>
        </div>
      </form>
    </div>
  );
}