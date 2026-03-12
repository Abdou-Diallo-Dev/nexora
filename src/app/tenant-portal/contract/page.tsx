'use client';
import { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Home, DollarSign, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateLeaseContract } from '@/lib/pdf';
import { toast } from 'sonner';

type Lease = {
  id: string; start_date: string; end_date: string; rent_amount: number;
  charges_amount: number; deposit_amount: number; payment_day: number; status: string;
  properties: { name: string; address: string; city: string; type: string } | null;
};

type CompanyInfo = {
  name: string; email: string | null; phone: string | null;
  address: string | null; logo_url: string | null; primary_color: string | null;
};

const STATUS: Record<string, { l: string; v: 'success' | 'warning' | 'error' | 'default' }> = {
  active:    { l: 'Actif',    v: 'success' },
  expired:   { l: 'Expiré',   v: 'error'   },
  cancelled: { l: 'Résilié',  v: 'default' },
};

export default function TenantContractPage() {
  const { user } = useAuthStore();
  const [lease, setLease]         = useState<Lease | null>(null);
  const [company, setCompany]     = useState<CompanyInfo | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }

        const [{ data: leaseData }, { data: tenantData }, { data: companyData }] = await Promise.all([
          sb.from('leases')
            .select('id,start_date,end_date,rent_amount,charges_amount,deposit_amount,payment_day,status,properties(name,address,city,type)')
            .eq('tenant_id', ta.tenant_id)
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle(),

          sb.from('tenants')
            .select('first_name,last_name,email,phone')
            .eq('id', ta.tenant_id)
            .maybeSingle(),

          sb.from('companies')
            .select('name,email,phone,address,logo_url,primary_color')
            .eq('id', ta.company_id)
            .maybeSingle(),
        ]);

        setLease(leaseData as any);
        setCompany(companyData as any);
        if (tenantData) {
          setTenantName(`${(tenantData as any).first_name} ${(tenantData as any).last_name}`);
          setTenantEmail((tenantData as any).email || '');
        }
        setLoading(false);
      });
  }, [user?.id]);

  const downloadContract = async () => {
    if (!lease || !company) return;
    setGenerating(true);
    try {
      await generateLeaseContract({
        tenantName,
        tenantEmail,
        propertyName:    lease.properties?.name || '',
        propertyAddress: lease.properties?.address || '',
        propertyCity:    lease.properties?.city || '',
        startDate:       lease.start_date,
        endDate:         lease.end_date,
        rentAmount:      lease.rent_amount,
        chargesAmount:   lease.charges_amount || 0,
        depositAmount:   lease.deposit_amount,
        paymentDay:      lease.payment_day || 1,
        companyName:     company.name,
        companyEmail:    company.email ?? undefined,
        companyAddress:  company.address ?? undefined,
        companyLogoUrl:  company.logo_url,
        primaryColor:    company.primary_color,
      });
      toast.success('Contrat téléchargé');
    } catch {
      toast.error('Erreur lors de la génération');
    }
    setGenerating(false);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

  if (!lease) return (
    <div className="text-center py-16 text-muted-foreground">
      <FileText size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium text-foreground mb-1">Aucun contrat trouvé</p>
      <p className="text-sm">Contactez votre gestionnaire pour plus d'informations.</p>
    </div>
  );

  const st = STATUS[lease.status] || { l: lease.status, v: 'default' as const };
  const totalMonths = Math.round((new Date(lease.end_date).getTime() - new Date(lease.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const elapsed     = Math.round((Date.now() - new Date(lease.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const progress    = Math.min(100, Math.max(0, (elapsed / totalMonths) * 100));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Mon contrat de bail</h1>
            <p className="text-xs text-muted-foreground">Bail de location</p>
          </div>
        </div>
        <Badge variant={st.v}>{st.l}</Badge>
      </div>

      {/* Property card */}
      <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Home size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-lg">{lease.properties?.name || '—'}</p>
            <p className="text-sm text-white/80">{lease.properties?.address}</p>
            <p className="text-sm text-white/80">{lease.properties?.city}</p>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Calendar size={16} className="text-blue-600" />, bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Début', value: formatDate(lease.start_date) },
          { icon: <Calendar size={16} className="text-red-500" />,  bg: 'bg-red-50 dark:bg-red-900/20',  label: 'Fin',   value: formatDate(lease.end_date) },
          { icon: <DollarSign size={16} className="text-green-600" />, bg: 'bg-green-50 dark:bg-green-900/20', label: 'Loyer mensuel', value: formatCurrency(lease.rent_amount) },
          { icon: <Clock size={16} className="text-purple-600" />, bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Paiement', value: `Le ${lease.payment_day || 1} du mois` },
        ].map(item => (
          <div key={item.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
            <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center mb-2`}>
              {item.icon}
            </div>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="font-semibold text-foreground text-sm mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charges & deposit */}
      {(lease.charges_amount > 0 || lease.deposit_amount > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4 space-y-2">
          {lease.charges_amount > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Charges mensuelles</p>
              <p className="font-semibold text-foreground text-sm">{formatCurrency(lease.charges_amount)}</p>
            </div>
          )}
          {lease.deposit_amount > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Dépôt de garantie</p>
              <p className="font-semibold text-foreground text-sm">{formatCurrency(lease.deposit_amount)}</p>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-sm font-medium text-foreground">Total mensuel</p>
            <p className="font-bold text-primary">{formatCurrency(lease.rent_amount + (lease.charges_amount || 0))}</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Durée du bail</p>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{formatDate(lease.start_date)}</p>
          <p className="text-xs text-primary font-medium">{Math.round(progress)}% écoulé</p>
          <p className="text-xs text-muted-foreground">{formatDate(lease.end_date)}</p>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={downloadContract}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {generating ? <LoadingSpinner size={18} /> : <Download size={18} />}
        {generating ? 'Génération en cours...' : 'Télécharger le contrat PDF'}
      </button>

      {/* Company info */}
      {company && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Votre gestionnaire</p>
          <p className="font-semibold text-foreground">{company.name}</p>
          {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
          {company.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
        </div>
      )}
    </div>
  );
}