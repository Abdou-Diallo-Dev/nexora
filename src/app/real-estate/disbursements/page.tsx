'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Clock, Building2, Trash2, DollarSign, TrendingDown, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, Badge, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Disbursement = {
  id: string; rent_amount: number; commission_rate: number; commission_amount: number;
  expenses_amount: number; net_amount: number; status: 'pending'|'paid';
  paid_date: string|null; notes: string|null; created_at: string;
  period_month: number|null; period_year: number|null;
  leases: { properties: { name: string }|null; tenants: { first_name: string; last_name: string }|null }|null;
};

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function DisbursementsPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Disbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [markingId, setMarkingId] = useState<string|null>(null);
  const { page, pageSize, offset, setPage } = usePagination(20);
  const [commissionRate, setCommissionRate] = useState(10);
  const [summary, setSummary] = useState({ pending:0, paid:0, pendingAmount:0, paidAmount:0 });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();

    // Load commission rate
    const { data: comp } = await sb.from('companies').select('commission_rate').eq('id', company.id).maybeSingle();
    if (comp?.commission_rate) setCommissionRate(Number(comp.commission_rate));

    const { data, count } = await sb.from('disbursements')
      .select('id,rent_amount,commission_rate,commission_amount,expenses_amount,net_amount,status,paid_date,notes,created_at,period_month,period_year,leases(properties(name),tenants(first_name,last_name))', { count:'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);

    const all = (data||[]) as unknown as Disbursement[];
    setItems(all);
    setTotal(count||0);

    // Summary from all
    const { data: allData } = await sb.from('disbursements').select('status,net_amount').eq('company_id', company.id);
    const pending = (allData||[]).filter((d:any)=>d.status==='pending');
    const paid = (allData||[]).filter((d:any)=>d.status==='paid');
    setSummary({
      pending: pending.length,
      paid: paid.length,
      pendingAmount: pending.reduce((s:number,d:any)=>s+Number(d.net_amount),0),
      paidAmount: paid.reduce((s:number,d:any)=>s+Number(d.net_amount),0),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id, offset, pageSize]);

  // Generate disbursements from paid rent payments
  const generateFromPayments = async () => {
    if (!company?.id) return;
    setGenerating(true);
    const sb = createClient();

    // Get all paid payments not yet disbursed
    const { data: payments } = await sb.from('rent_payments')
      .select('id,amount,period_month,period_year,lease_id,charges_amount')
      .eq('company_id', company.id)
      .eq('status', 'paid');

    if (!payments || payments.length === 0) {
      toast.error('Aucun paiement reçu à reverser');
      setGenerating(false); return;
    }

    // Get existing disbursements to avoid duplicates
    const { data: existing } = await sb.from('disbursements')
      .select('lease_id,period_month,period_year').eq('company_id', company.id);

    const existingKeys = new Set((existing||[]).map((d:any)=>`${d.lease_id}-${d.period_month}-${d.period_year}`));

    // Get expenses per lease
    const { data: expenses } = await sb.from('expenses')
      .select('amount,lease_id,type').eq('company_id', company.id).eq('type','bailleur');

    let generated = 0;
    for (const p of payments) {
      const key = `${p.lease_id}-${p.period_month}-${p.period_year}`;
      if (existingKeys.has(key)) continue;

      const leaseExpenses = (expenses||[]).filter((e:any)=>e.lease_id===p.lease_id)
        .reduce((s:number,e:any)=>s+Number(e.amount),0);
      const rentAmt = Number(p.amount);
      const commAmt = rentAmt * (commissionRate/100);
      const netAmt = Math.max(0, rentAmt - commAmt - leaseExpenses);

      await sb.from('disbursements').insert({
        company_id: company.id,
        lease_id: p.lease_id,
        rent_amount: rentAmt,
        commission_rate: commissionRate,
        commission_amount: commAmt,
        expenses_amount: leaseExpenses,
        net_amount: netAmt,
        status: 'pending',
        period_month: p.period_month,
        period_year: p.period_year,
      });
      generated++;
    }

    setGenerating(false);
    if (generated > 0) {
      toast.success(`${generated} reversement(s) généré(s) ✓`);
      load();
    } else {
      toast.info('Tous les paiements ont déjà été reversés');
    }
  };

  const markAsPaid = async (id: string) => {
    setMarkingId(id);
    await createClient().from('disbursements').update({ status:'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', id);
    toast.success('Reversement marqué comme payé ✓');
    setMarkingId(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('disbursements').delete().eq('id', deleteId);
    toast.success('Reversement supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  return (
    <div>
      <PageHeader title="Reversements bailleurs" subtitle="Montants nets à reverser aux propriétaires"
        actions={
          <button onClick={generateFromPayments} disabled={generating} className={btnPrimary}>
            {generating?<LoadingSpinner size={15}/>:<RefreshCw size={15}/>}
            {generating?'Génération...':'Générer depuis les loyers'}
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase mb-1 flex items-center gap-1"><Clock size={11}/>En attente</p>
          <p className="text-xl font-bold text-amber-700">{summary.pending}</p>
          <p className="text-xs text-amber-600">{formatCurrency(summary.pendingAmount)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-green-700 uppercase mb-1 flex items-center gap-1"><CheckCircle size={11}/>Payés</p>
          <p className="text-xl font-bold text-green-700">{summary.paid}</p>
          <p className="text-xs text-green-600">{formatCurrency(summary.paidAmount)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase mb-1 flex items-center gap-1"><Wallet size={11}/>Total reversé</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(summary.paidAmount)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-purple-700 uppercase mb-1 flex items-center gap-1"><TrendingDown size={11}/>Commission</p>
          <p className="text-xl font-bold text-purple-700">{commissionRate}%</p>
          <p className="text-xs text-purple-600">taux actuel</p>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">💡 Fonctionnement automatique</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Cliquez sur <strong>"Générer depuis les loyers"</strong> pour créer automatiquement les reversements à partir des loyers perçus.
          Formule : <strong>Loyer reçu − Commission ({commissionRate}%) − Dépenses bailleur = Net à reverser</strong>
        </p>
      </div>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32}/></div>
        : items.length===0 ? (
          <EmptyState icon={<Building2 size={24}/>} title="Aucun reversement"
            description="Cliquez sur 'Générer depuis les loyers' pour créer les reversements automatiquement"
            action={<button onClick={generateFromPayments} disabled={generating} className={btnPrimary}><RefreshCw size={15}/>Générer</button>}
          />
        ) : (
          <div className={cardCls}>
            {/* Header */}
            <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_120px_100px_80px] gap-3 px-5 py-3 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Bien / Locataire</span><span>Période</span><span>Loyer</span><span>Commission</span><span>Net à reverser</span><span>Statut</span><span></span>
            </div>
            <div className="divide-y divide-border">
              {items.map(d => {
                const prop = d.leases?.properties?.name||'—';
                const tenant = d.leases?.tenants ? `${d.leases.tenants.first_name} ${d.leases.tenants.last_name}` : '—';
                const period = d.period_month && d.period_year ? `${MONTHS[d.period_month-1]} ${d.period_year}` : formatDate(d.created_at);
                return (
                  <div key={d.id} className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_100px_120px_100px_80px] gap-2 md:gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{prop}</p>
                      <p className="text-xs text-muted-foreground">{tenant}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{period}</div>
                    <div className="text-sm font-medium">{formatCurrency(d.rent_amount)}</div>
                    <div className="text-sm text-red-600">−{formatCurrency(d.commission_amount)}</div>
                    <div className="text-sm font-bold text-green-600">{formatCurrency(d.net_amount)}</div>
                    <div>
                      <Badge variant={d.status==='paid'?'success':'warning'}>
                        {d.status==='paid'?'Payé':'En attente'}
                      </Badge>
                      {d.paid_date && <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(d.paid_date)}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {d.status==='pending' && (
                        <button onClick={()=>markAsPaid(d.id)} disabled={markingId===d.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors" title="Marquer payé">
                          {markingId===d.id?<LoadingSpinner size={13}/>:<CheckCircle size={13}/>}
                        </button>
                      )}
                      <button onClick={()=>setDeleteId(d.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
          </div>
        )}

      <ConfirmDialog open={!!deleteId} title="Supprimer ce reversement ?"
        description="Action irréversible." confirmLabel={deleting?'Suppression...':'Supprimer'}
        onConfirm={handleDelete} onCancel={()=>setDeleteId(null)}/>
    </div>
  );
}