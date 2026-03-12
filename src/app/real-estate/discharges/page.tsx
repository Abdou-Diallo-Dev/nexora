'use client';
import { useState, useEffect } from 'react';
import { FileDown, FileMinus } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, btnPrimary, inputCls, labelCls, cardCls } from '@/components/ui';
import { generateTerminationPDF } from '@/lib/pdf';

type Lease = {
  id: string; start_date: string; end_date: string;
  rent_amount: number; deposit_amount: number | null;
  tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  properties: { name: string; address: string; city: string } | null;
};
type CompanySettings = {
  name: string; logo_url?: string | null; address?: string | null;
  email?: string | null; phone?: string | null; primary_color?: string | null;
};

export default function DischargePage() {
  const { company } = useAuthStore();
  const [leases, setLeases]         = useState<Lease[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    leaseId: '', terminationDate: new Date().toISOString().slice(0,10),
    depositReturned: '', reason: '', customText: '',
  });

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    Promise.all([
      fetch(`/api/real-estate/leases-active?company_id=${company.id}`).then(r => r.json()),
      sb.from('companies').select('name,logo_url,address,email,phone,primary_color').eq('id', company.id).maybeSingle(),
    ]).then(([leasesRes, { data: c }]) => {
      setLeases((leasesRes.data || []) as unknown as Lease[]);
      setCompanySettings(c);
      setLoading(false);
    });
  }, [company?.id]);

  const selected = leases.find(l => l.id === form.leaseId);

  const handleGenerate = async () => {
    if (!form.leaseId) { toast.error('Sélectionnez un bail'); return; }
    if (!selected?.tenants || !selected?.properties) { toast.error('Données incomplètes'); return; }
    setGenerating(true);
    try {
      await generateTerminationPDF({
        docType:           'decharge',
        tenantName:        `${selected.tenants.first_name} ${selected.tenants.last_name}`,
        tenantEmail:       selected.tenants.email,
        tenantPhone:       selected.tenants.phone    ?? undefined,
        propertyName:      selected.properties.name,
        propertyAddress:   `${selected.properties.address}, ${selected.properties.city}`,
        startDate:         selected.start_date,
        endDate:           selected.end_date,
        terminationDate:   form.terminationDate,
        rentAmount:        selected.rent_amount,
        depositReturned:   form.depositReturned ? Number(form.depositReturned) : undefined,
        reason:            form.reason || undefined,
        customText:        form.customText || undefined,
        companyName:       companySettings?.name || company?.name || '',
        companyAddress:    companySettings?.address,
        companyEmail:      companySettings?.email,
        companyPhone:      companySettings?.phone,
        companyLogoUrl:    companySettings?.logo_url,
        primaryColor:      companySettings?.primary_color,
      });
      toast.success('Décharge générée avec succès');
    } catch { toast.error('Erreur lors de la génération'); }
    setGenerating(false);
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
          <FileMinus size={20} className="text-orange-600"/>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Décharges</h1>
          <p className="text-sm text-muted-foreground">Générez un document de décharge entre les parties</p>
        </div>
      </div>

      <div className={cardCls+' p-6 max-w-2xl space-y-5'}>
        <div>
          <label className={labelCls}>Bail concerné *</label>
          <select value={form.leaseId} onChange={e => setForm(f => ({...f, leaseId: e.target.value}))} className={inputCls}>
            <option value="">-- Sélectionner un bail --</option>
            {leases.map(l => (
              <option key={l.id} value={l.id}>
                {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—'} — {l.properties?.name || '—'}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 text-sm">
            <p className="font-medium text-orange-800 dark:text-orange-300">
              {selected.tenants?.first_name} {selected.tenants?.last_name} — {selected.properties?.name}
            </p>
            <p className="text-orange-600 dark:text-orange-400 text-xs mt-0.5">
              {selected.properties?.address}, {selected.properties?.city}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date de décharge *</label>
            <input type="date" value={form.terminationDate} onChange={e => setForm(f => ({...f, terminationDate: e.target.value}))} className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>Caution restituée (FCFA)</label>
            <input type="number" value={form.depositReturned} onChange={e => setForm(f => ({...f, depositReturned: e.target.value}))}
              placeholder={selected?.deposit_amount ? String(selected.deposit_amount) : '0'} className={inputCls}/>
          </div>
        </div>

        <div>
          <label className={labelCls}>Motif de la décharge</label>
          <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
            placeholder="Ex: Fin de bail, départ volontaire..." className={inputCls}/>
        </div>

        <div>
          <label className={labelCls}>Texte personnalisé (optionnel)</label>
          <textarea value={form.customText} onChange={e => setForm(f => ({...f, customText: e.target.value}))}
            rows={4} placeholder="Clauses ou informations supplémentaires..." className={inputCls}/>
        </div>

        <button onClick={handleGenerate} disabled={generating || !form.leaseId} className={btnPrimary}>
          {generating ? <LoadingSpinner size={16}/> : <FileDown size={16}/>}
          Générer la décharge PDF
        </button>
      </div>
    </div>
  );
}