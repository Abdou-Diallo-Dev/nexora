'use client';
import { useEffect, useState } from 'react';
import { FileText, FileCheck, Receipt, ScrollText, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Badge, cardCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateReceiptPDF, generateContractPDF } from '@/lib/pdf';
import { toast } from 'sonner';

type Lease = {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  charges_amount: number;
  deposit_amount: number | null;
  payment_day: number;
  status: string;
  tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  properties: { name: string; address: string; city: string; type: string } | null;
};

type GeneratingState = { id: string; type: 'receipt' | 'contract' } | null;

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function DocumentsPage() {
  const { company } = useAuthStore();
  const [leases, setLeases]       = useState<Lease[]>([]);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState<GeneratingState>(null);

  useEffect(() => {
    if (!company?.id) return;
    createClient()
      .from('leases')
      .select('id,start_date,end_date,rent_amount,charges_amount,deposit_amount,payment_day,status,tenants(first_name,last_name,email,phone),properties(name,address,city,type)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setLeases((data || []) as unknown as Lease[]); setLoading(false); });
  }, [company?.id]);

  const handleReceipt = async (l: Lease) => {
    if (!l.tenants || !l.properties) { toast.error('Données incomplètes'); return; }
    setGenerating({ id: l.id, type: 'receipt' });
    try {
      const now = new Date();
      await generateReceiptPDF({
        reference:       `QUITT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`,
        tenantName:      `${l.tenants.first_name} ${l.tenants.last_name}`,
        tenantPhone:     l.tenants.phone   || undefined,
        tenantEmail:     l.tenants.email,
        propertyName:    l.properties.name,
        propertyAddress: l.properties.address,
        propertyCity:    l.properties.city,
        propertyType:    l.properties.type,
        periodMonth:     now.getMonth() + 1,
        periodYear:      now.getFullYear(),
        amount:          l.rent_amount,
        chargesAmount:   l.charges_amount,
        paidDate:        now.toISOString().slice(0, 10),
        paymentMethod:   'cash',
        status:          'paid',
        companyName:     company?.name || '',
        companyAddress:  (company as any)?.address || undefined,
        companyPhone:    (company as any)?.phone   || undefined,
        companyEmail:    (company as any)?.email   || undefined,
      });
      toast.success('Quittance PDF téléchargée');
    } catch { toast.error('Erreur génération'); }
    setGenerating(null);
  };

  const handleContract = async (l: Lease) => {
    if (!l.tenants || !l.properties) { toast.error('Données incomplètes'); return; }
    setGenerating({ id: l.id, type: 'contract' });
    try {
      await generateContractPDF({
        tenantName:      `${l.tenants.first_name} ${l.tenants.last_name}`,
        tenantEmail:     l.tenants.email,
        tenantPhone:     l.tenants.phone   || undefined,
        propertyName:    l.properties.name,
        propertyAddress: l.properties.address,
        propertyCity:    l.properties.city,
        propertyType:    l.properties.type,
        startDate:       l.start_date,
        endDate:         l.end_date,
        rentAmount:      l.rent_amount,
        chargesAmount:   l.charges_amount,
        depositAmount:   l.deposit_amount,
        paymentDay:      l.payment_day,
        companyName:     company?.name || '',
        companyAddress:  (company as any)?.address || undefined,
        companyEmail:    (company as any)?.email   || undefined,
        companyPhone:    (company as any)?.phone   || undefined,
      });
      toast.success('Contrat PDF téléchargé');
    } catch { toast.error('Erreur génération'); }
    setGenerating(null);
  };

  const isGen = (id: string, type: 'receipt' | 'contract') =>
    generating?.id === id && generating?.type === type;

  const now = new Date();

  return (
    <div>
      <PageHeader title="Documents & PDF" subtitle="Générez vos quittances et contrats officiels" />

      <div className="mb-5 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <FileCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Période en cours : <strong>{MONTHS_FR[now.getMonth()]} {now.getFullYear()}</strong>
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            Les quittances sont générées pour le mois en cours. Les contrats reprennent les données complètes du bail.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><LoadingSpinner size={32} /></div>
      ) : leases.length === 0 ? (
        <EmptyState icon={<FileCheck size={24} />} title="Aucun bail trouvé" description="Créez des baux pour générer des documents PDF" />
      ) : (
        <div className={cardCls}>
          <div className="hidden md:grid grid-cols-[1fr_140px_160px_160px] gap-4 px-5 py-3 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Locataire / Bien</span>
            <span>Loyer</span>
            <span className="text-center">Quittance PDF</span>
            <span className="text-center">Contrat PDF</span>
          </div>
          <div className="divide-y divide-border">
            {leases.map(l => (
              <div key={l.id} className="grid grid-cols-1 md:grid-cols-[1fr_140px_160px_160px] gap-4 px-5 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {l.properties?.name}{l.properties?.city ? ` · ${l.properties.city}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(l.start_date)} → {formatDate(l.end_date)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{formatCurrency(l.rent_amount)}</p>
                  {l.charges_amount > 0 && <p className="text-xs text-muted-foreground">+{formatCurrency(l.charges_amount)} charges</p>}
                  <Badge variant={l.status === 'active' ? 'success' : 'default'} className="mt-1">
                    {l.status === 'active' ? 'Actif' : l.status}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <button onClick={() => handleReceipt(l)} disabled={!!generating}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors w-full justify-center">
                    {isGen(l.id, 'receipt') ? <Loader2 size={13} className="animate-spin" /> : <Receipt size={13} />}
                    Quittance PDF
                  </button>
                </div>
                <div className="flex justify-center">
                  <button onClick={() => handleContract(l)} disabled={!!generating}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors w-full justify-center">
                    {isGen(l.id, 'contract') ? <Loader2 size={13} className="animate-spin" /> : <ScrollText size={13} />}
                    Contrat PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border bg-slate-50 dark:bg-slate-700/20">
            <p className="text-xs text-muted-foreground">{leases.length} bail(s) · Fichiers téléchargés en PDF</p>
          </div>
        </div>
      )}
    </div>
  );
}