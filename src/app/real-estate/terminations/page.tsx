'use client';
import { useState, useEffect } from 'react';
import { FileDown, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, btnPrimary, inputCls, labelCls, cardCls } from '@/components/ui';
import { generateTerminationPDF } from '@/lib/pdf';
import type { TerminationDocType } from '@/lib/pdf';

type Lease = {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number | null;
  tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  properties: { name: string; address: string; city: string } | null;
};

const DOC_TYPES: { id: TerminationDocType; label: string; icon: string; desc: string }[] = [
  { id: 'resiliation_contrat',    label: 'Résiliation de contrat',    icon: '📄', desc: 'Mettre fin au contrat de location' },
  { id: 'resiliation_convention', label: 'Résiliation de convention', icon: '📋', desc: 'Résiliation d\'une convention signée' },
  { id: 'decharge',               label: 'Décharge',                  icon: '✅', desc: 'Document de décharge entre les parties' },
  { id: 'attestation_fin',        label: 'Attestation de fin',        icon: '🏅', desc: 'Atteste la fin de la location' },
];

export default function TerminationsPage() {
  const { company } = useAuthStore();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [docType, setDocType] = useState<TerminationDocType>('resiliation_contrat');
  const [form, setForm] = useState({
    leaseId: '',
    terminationDate: new Date().toISOString().split('T')[0],
    reason: '',
    depositReturned: '',
    customText: '',
  });

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    Promise.all([
      sb.from('leases')
        .select('id,start_date,end_date,rent_amount,deposit_amount,tenants(first_name,last_name,email,phone),properties(name,address,city)')
        .eq('company_id', company.id)
        .in('status', ['active', 'suspended'])
        .order('start_date', { ascending: false }),
      sb.from('companies').select('name,logo_url,address,email,phone').eq('id', company.id).maybeSingle(),
    ]).then(([{ data: l }, { data: c }]) => {
      setLeases((l || []) as Lease[]);
      setCompanySettings(c);
      setLoading(false);
    });
  }, [company?.id]);

  const selectedLease = leases.find(l => l.id === form.leaseId);

  const handleGenerate = async () => {
    if (!form.leaseId) { toast.error('Sélectionnez un bail'); return; }
    if (!selectedLease) return;
    const t = selectedLease.tenants;
    const p = selectedLease.properties;
    setGenerating(true);
    try {
      await generateTerminationPDF({
        docType,
        tenantName: t ? `${t.first_name} ${t.last_name}` : '',
        tenantEmail: t?.email,
        tenantPhone: t?.phone || undefined,
        propertyName: p?.name || '',
        propertyAddress: p ? `${p.address}, ${p.city}` : '',
        startDate: new Date(selectedLease.start_date).toLocaleDateString('fr-FR'),
        endDate: new Date(selectedLease.end_date).toLocaleDateString('fr-FR'),
        terminationDate: new Date(form.terminationDate).toLocaleDateString('fr-FR'),
        rentAmount: selectedLease.rent_amount,
        depositReturned: form.depositReturned ? Number(form.depositReturned) : undefined,
        reason: form.reason || undefined,
        customText: form.customText || undefined,
        companyName: companySettings?.name || company?.name || '',
        companyLogoUrl: companySettings?.logo_url,
        companyAddress: companySettings?.address,
        companyEmail: companySettings?.email,
        companyPhone: companySettings?.phone,
      });
      toast.success('Document PDF généré avec succès');
    } catch { toast.error('Erreur génération PDF'); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <ScrollText size={20} className="text-primary"/>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Documents de résiliation</h1>
          <p className="text-sm text-muted-foreground">Générez vos documents administratifs de fin de bail</p>
        </div>
      </div>

      {/* Type de document */}
      <div className={cardCls + ' p-6 space-y-3'}>
        <h2 className="font-bold text-foreground text-base">Type de document</h2>
        <div className="grid grid-cols-2 gap-3">
          {DOC_TYPES.map(dt => (
            <button key={dt.id} onClick={() => setDocType(dt.id)}
              className={'p-4 rounded-xl border-2 text-left transition-all ' + (
                docType === dt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              )}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{dt.icon}</span>
                <div>
                  <p className={'font-semibold text-sm ' + (docType === dt.id ? 'text-primary' : 'text-foreground')}>{dt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dt.desc}</p>
                </div>
                {docType === dt.id && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sélection du bail */}
      <div className={cardCls + ' p-6 space-y-4'}>
        <h2 className="font-bold text-foreground text-base">Bail concerné</h2>
        <div>
          <label className={labelCls}>Sélectionner un bail *</label>
          <select value={form.leaseId} onChange={e => setForm(f => ({...f, leaseId: e.target.value}))} className={inputCls}>
            <option value="">Choisir un bail actif...</option>
            {leases.map(l => (
              <option key={l.id} value={l.id}>
                {l.tenants?.first_name} {l.tenants?.last_name} — {l.properties?.name}
              </option>
            ))}
          </select>
        </div>
        {selectedLease && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-1">Locataire</p>
              <p className="text-sm font-bold text-foreground">{selectedLease.tenants?.first_name} {selectedLease.tenants?.last_name}</p>
              <p className="text-xs text-muted-foreground">{selectedLease.tenants?.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-1">Bien</p>
              <p className="text-sm font-bold text-foreground">{selectedLease.properties?.name}</p>
              <p className="text-xs text-muted-foreground">{selectedLease.properties?.address}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-1">Période</p>
              <p className="text-xs text-foreground">
                {new Date(selectedLease.start_date).toLocaleDateString('fr-FR')} → {new Date(selectedLease.end_date).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-1">Loyer mensuel</p>
              <p className="text-sm font-bold text-foreground">{selectedLease.rent_amount?.toLocaleString('fr-FR')} FCFA</p>
            </div>
          </div>
        )}
      </div>

      {/* Détails */}
      <div className={cardCls + ' p-6 space-y-4'}>
        <h2 className="font-bold text-foreground text-base">Détails du document</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date de résiliation *</label>
            <input type="date" value={form.terminationDate} onChange={e => setForm(f => ({...f, terminationDate: e.target.value}))} className={inputCls}/>
          </div>
          {(docType === 'decharge' || docType === 'attestation_fin') && (
            <div>
              <label className={labelCls}>Dépôt restitué (FCFA)</label>
              <input type="number" value={form.depositReturned} onChange={e => setForm(f => ({...f, depositReturned: e.target.value}))}
                placeholder={selectedLease?.deposit_amount?.toString() || '0'} className={inputCls}/>
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Motif {docType === 'resiliation_contrat' ? '(facultatif)' : ''}</label>
          <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
            placeholder="Ex: Départ volontaire, fin de bail, non-paiement..." className={inputCls}/>
        </div>
        <div>
          <label className={labelCls}>Texte personnalisé (remplace le texte par défaut)</label>
          <textarea value={form.customText} onChange={e => setForm(f => ({...f, customText: e.target.value}))}
            rows={4} placeholder="Laissez vide pour utiliser le modèle automatique..." className={inputCls + ' resize-none'}/>
        </div>
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={handleGenerate} disabled={generating || !form.leaseId} className={btnPrimary + ' gap-2 px-8 disabled:opacity-50'}>
          {generating ? <LoadingSpinner size={16}/> : <FileDown size={16}/>}
          Générer le document PDF
        </button>
      </div>
    </div>
  );
}