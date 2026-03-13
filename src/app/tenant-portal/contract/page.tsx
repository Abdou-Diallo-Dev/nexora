'use client';
import { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Home, CreditCard, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateContractPDF } from '@/lib/pdf';
import { toast } from 'sonner';

type Lease = {
  id: string; start_date: string; end_date: string | null;
  rent_amount: number; charges_amount: number; deposit_amount: number;
  payment_day: number; status: string;
  properties: { name: string; address: string; city: string; type: string } | null;
};
type Company = { name: string; email: string | null; phone: string | null; address: string | null; logo_url: string | null; primary_color: string | null };
type Tenant  = { first_name: string; last_name: string; phone: string | null; email: string };

const LEASE_STATUS: Record<string, { l: string; v: BadgeVariant }> = {
  active:    { l: 'Actif',    v: 'success' },
  pending:   { l: 'En cours', v: 'warning' },
  expired:   { l: 'Expiré',   v: 'error'   },
  cancelled: { l: 'Résilié',  v: 'default' },
};

export default function TenantContractPage() {
  const { user } = useAuthStore();
  const [lease, setLease]           = useState<Lease | null>(null);
  const [company, setCompany]       = useState<Company | null>(null);
  const [tenant, setTenant]         = useState<Tenant | null>(null);
  const [loading, setLoading]       = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();

    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(async ({ data: ta }) => {
        if (!ta) { setLoading(false); return; }

        const [{ data: l }, { data: t }, { data: c }] = await Promise.all([
          sb.from('leases')
            .select('id,start_date,end_date,rent_amount,charges_amount,deposit_amount,payment_day,status,properties(name,address,city,type)')
            .eq('tenant_id', ta.tenant_id)
            .order('created_at', { ascending: false })
            .limit(1).maybeSingle(),
          sb.from('tenants').select('first_name,last_name,phone,email').eq('id', ta.tenant_id).maybeSingle(),
          sb.from('companies').select('name,email,phone,address,logo_url,primary_color').eq('id', ta.company_id).maybeSingle(),
        ]);

        setLease(l as Lease | null);
        setTenant(t as Tenant | null);
        setCompany(c as Company | null);
        setLoading(false);

        // Realtime — sync if admin updates/adds lease
        const channel = sb.channel(`tenant-lease-${ta.tenant_id}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'leases',
            filter: `tenant_id=eq.${ta.tenant_id}`,
          }, async (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              // Reload with property join
              const { data: updated } = await sb.from('leases')
                .select('id,start_date,end_date,rent_amount,charges_amount,deposit_amount,payment_day,status,properties(name,address,city,type)')
                .eq('id', (payload.new as any).id).maybeSingle();
              if (updated) {
                setLease(updated as Lease);
                toast.info('Votre contrat a été mis à jour');
              }
            }
          })
          .subscribe();

        return () => { sb.removeChannel(channel); };
      });
  }, [user?.id]);

  const downloadContract = async () => {
    if (!lease || !tenant || !company) return;
    setDownloading(true);
    try {
      await generateContractPDF({
        tenantName:     `${tenant.first_name} ${tenant.last_name}`,
        tenantEmail:    tenant.email,
        tenantPhone:    tenant.phone || '',
        propertyName:   (lease.properties as any)?.name || '',
        propertyAddress: (lease.properties as any)?.address || '',
        propertyCity:    (lease.properties as any)?.city || '',
        propertyType:   (lease.properties as any)?.type || '',
        startDate:      lease.start_date,
        endDate:        lease.end_date || '',
        rentAmount:     lease.rent_amount,
        chargesAmount:  lease.charges_amount,
        depositAmount:  lease.deposit_amount,
        paymentDay:     lease.payment_day,
        companyName:    company.name,
        companyEmail:   company.email || '',
        companyPhone:   company.phone || '',
        companyAddress: company.address || '',
        companyLogoUrl: company.logo_url || undefined,
        primaryColor:   company.primary_color || undefined,
      });
    } catch (e) {
      toast.error('Erreur génération PDF');
    }
    setDownloading(false);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

  if (!lease) return (
    <div className="text-center py-16 text-muted-foreground">
      <FileText size={40} className="mx-auto mb-3 opacity-20" />
      <p className="font-medium text-foreground mb-1">Aucun contrat disponible</p>
      <p className="text-sm">Votre contrat apparaîtra ici dès qu'il sera enregistré</p>
    </div>
  );

  const sm = LEASE_STATUS[lease.status] || { l: lease.status, v: 'default' as BadgeVariant };
  const start = new Date(lease.start_date);
  const end   = lease.end_date ? new Date(lease.end_date) : null;
  const now   = new Date();
  const totalDays    = end ? (end.getTime() - start.getTime()) / 86400000 : null;
  const elapsedDays  = (now.getTime() - start.getTime()) / 86400000;
  const progress     = totalDays ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)) : null;
  const daysLeft     = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Mon contrat</h1>
            <p className="text-sm text-muted-foreground">{(lease.properties as any)?.name || 'Bien'}</p>
          </div>
        </div>
        <Badge variant={sm.v}>{sm.l}</Badge>
      </div>

      {/* Bien */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Home size={14} className="text-primary" />
          <p className="font-semibold text-foreground text-sm">Le logement</p>
        </div>
        <p className="font-medium text-foreground">{(lease.properties as any)?.name}</p>
        <p className="text-sm text-muted-foreground">{(lease.properties as any)?.address}, {(lease.properties as any)?.city}</p>
        <p className="text-xs text-muted-foreground capitalize mt-1">{(lease.properties as any)?.type}</p>
      </div>

      {/* Dates */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-primary" />
          <p className="font-semibold text-foreground text-sm">Durée du bail</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Début</p>
            <p className="font-semibold text-foreground">{formatDate(lease.start_date)}</p>
          </div>
          {end && (
            <div>
              <p className="text-xs text-muted-foreground">Fin</p>
              <p className="font-semibold text-foreground">{formatDate(lease.end_date!)}</p>
            </div>
          )}
        </div>
        {progress !== null && (
          <>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-1">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}% écoulé</span>
              {daysLeft !== null && (
                <span className={daysLeft < 30 ? 'text-red-500 font-medium' : ''}>
                  {daysLeft} jours restants
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Financier */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={14} className="text-primary" />
          <p className="font-semibold text-foreground text-sm">Conditions financières</p>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Loyer mensuel',   value: formatCurrency(lease.rent_amount) },
            { label: 'Charges',         value: formatCurrency(lease.charges_amount || 0) },
            { label: 'Dépôt de garantie', value: formatCurrency(lease.deposit_amount || 0) },
            { label: 'Total mensuel',   value: formatCurrency((lease.rent_amount || 0) + (lease.charges_amount || 0)), bold: true },
          ].map(row => (
            <div key={row.label} className={`flex justify-between py-1.5 ${row.bold ? 'border-t border-border pt-2 mt-1' : ''}`}>
              <span className={`text-sm ${row.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{row.label}</span>
              <span className={`text-sm ${row.bold ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>{row.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Paiement le {lease.payment_day} de chaque mois</p>
      </div>

      {/* Gestionnaire */}
      {company && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-border p-4">
          <p className="font-semibold text-foreground text-sm mb-2">Votre gestionnaire</p>
          <p className="font-medium text-foreground">{company.name}</p>
          {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
          {company.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
        </div>
      )}

      {/* Download */}
      <button onClick={downloadContract} disabled={downloading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
        {downloading ? <LoadingSpinner size={16} /> : <Download size={16} />}
        Télécharger le contrat PDF
      </button>
    </div>
  );
}