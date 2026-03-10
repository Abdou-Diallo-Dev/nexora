'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, FileDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, btnSecondary, btnPrimary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate, formatCurrency, isLeaseExpired, isLeaseExpiringSoon } from '@/lib/utils';
import { generateContractPDF } from '@/lib/pdf';
import { toast } from 'sonner';

type Lease = {
  id: string; status: string; start_date: string; end_date: string;
  rent_amount: number; charges_amount: number; deposit_amount: number | null;
  payment_day: number; notes: string | null;
  tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  properties: { name: string; address: string; city: string } | null;
};

const ST: Record<string,{l:string;v:BadgeVariant}> = {
  active:     { l:'Actif',      v:'success' },
  terminated: { l:'Résilié',    v:'error'   },
  expired:    { l:'Expiré',     v:'default' },
  suspended:  { l:'Suspendu',   v:'warning' },
};

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useAuthStore();
  const [l, setL] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    createClient().from('leases')
      .select('*,tenants(first_name,last_name,email,phone),properties(name,address,city)')
      .eq('id', id).maybeSingle()
      .then(({ data }) => { setL(data as Lease); setLoading(false); });
  }, [id]);

  const handleGeneratePDF = async () => {
    if (!l) return;
    setGenerating(true);
    try {
      await generateContractPDF({
        tenantName: l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—',
        tenantEmail: l.tenants?.email,
        tenantPhone: l.tenants?.phone || undefined,
        propertyName: l.properties?.name || '—',
        propertyAddress: l.properties?.address || '—',
        propertyCity: l.properties?.city || '—',
        startDate: l.start_date,
        endDate: l.end_date,
        rentAmount: Number(l.rent_amount) || 0,
        chargesAmount: Number(l.charges_amount) || 0,
        depositAmount: l.deposit_amount ? Number(l.deposit_amount) : null,
        paymentDay: l.payment_day,
        companyName: company?.name || 'ImmoGest Pro',
        companyAddress: company?.address || undefined,
        companyEmail: company?.email || undefined,
      });
      toast.success('Contrat téléchargé');
    } catch { toast.error('Erreur génération PDF'); }
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;
  if (!l) return <div className="text-center py-16 text-muted-foreground">Bail introuvable</div>;

  const st = ST[l.status] || { l: l.status, v: 'default' as BadgeVariant };
  const expiring = isLeaseExpiringSoon(l.end_date);
  const expired = isLeaseExpired(l.end_date);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/real-estate/leases" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <div className="flex-1" />
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          {generating ? <LoadingSpinner size={15} /> : <FileDown size={15} />}
          Contrat PDF
        </button>
        <Link href={`/real-estate/leases/${id}/edit`} className={btnPrimary}>
          <Edit size={15} />Modifier
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <PageHeader title={`Bail — ${l.tenants?.first_name} ${l.tenants?.last_name}`} />
        <Badge variant={st.v}>{st.l}</Badge>
        {expiring && !expired && <Badge variant="warning">Expire bientôt</Badge>}
        {expired && <Badge variant="error">Expiré</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tenant */}
        <div className={cardCls + ' divide-y divide-border'}>
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-700/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Locataire</p>
          </div>
          {[
            ['Nom', `${l.tenants?.first_name} ${l.tenants?.last_name}`],
            ['Email', l.tenants?.email || '—'],
            ['Téléphone', l.tenants?.phone || '—'],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>

        {/* Property */}
        <div className={cardCls + ' divide-y divide-border'}>
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-700/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bien loué</p>
          </div>
          {[
            ['Désignation', l.properties?.name || '—'],
            ['Adresse', l.properties?.address || '—'],
            ['Ville', l.properties?.city || '—'],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className={cardCls + ' divide-y divide-border'}>
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-700/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Durée</p>
          </div>
          {[
            ['Début', formatDate(l.start_date)],
            ['Fin', formatDate(l.end_date)],
            ['Jour de paiement', `Le ${l.payment_day} du mois`],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>

        {/* Financials */}
        <div className={cardCls + ' divide-y divide-border'}>
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-700/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finances</p>
          </div>
          {[
            ['Loyer', formatCurrency(l.rent_amount)],
            ['Charges', formatCurrency(l.charges_amount)],
            ['Total mensuel', formatCurrency(l.rent_amount + l.charges_amount)],
            ['Dépôt de garantie', l.deposit_amount ? formatCurrency(l.deposit_amount) : '—'],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className={`text-sm font-semibold ${k === 'Total mensuel' ? 'text-primary' : 'text-foreground'}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {l.notes && (
        <div className={cardCls + ' mt-4 p-5'}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
          <p className="text-sm text-foreground">{l.notes}</p>
        </div>
      )}
    </div>
  );
}