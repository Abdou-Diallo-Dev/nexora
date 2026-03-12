'use client';
import { useState, useEffect } from 'react';
import { FileDown, ScrollText, Search, ChevronDown, User, Building2, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, btnPrimary, inputCls, labelCls, cardCls } from '@/components/ui';
import { generateTerminationPDF } from '@/lib/pdf';
import type { TerminationDocType } from '@/lib/pdf';
import { formatCurrency } from '@/lib/utils';

type Lease = {
  id: string; status: string;
  start_date: string; end_date: string;
  rent_amount: number; deposit_amount: number | null;
  tenants: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  properties: { name: string; address: string; city: string } | null;
};

const DOC_TYPES: { id: TerminationDocType; label: string; icon: string; desc: string }[] = [
  { id: 'resiliation_contrat',    label: 'Résiliation de contrat',    icon: '📄', desc: 'Mettre fin au contrat de location' },
  { id: 'resiliation_convention', label: 'Résiliation de convention', icon: '📋', desc: 'Résiliation d\'une convention signée' },
  { id: 'decharge',               label: 'Décharge',                  icon: '✅', desc: 'Document de décharge entre les parties' },
  { id: 'attestation_fin',        label: 'Attestation de fin',        icon: '🏅', desc: 'Atteste la fin de la location' },
];

type CompanySettings = {
  name: string; logo_url?: string | null; address?: string | null;
  email?: string | null; phone?: string | null; primary_color?: string | null;
};

export default function TerminationsPage() {
  const { company } = useAuthStore();
  const [leases, setLeases]     = useState<Lease[]>([]);
  const [filtered, setFiltered] = useState<Lease[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch]     = useState('');
  const [dropOpen, setDropOpen] = useState(false);

  const [docType, setDocType]   = useState<TerminationDocType>('resiliation_contrat');
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [form, setForm] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    reason: '', depositReturned: '', customText: '',
  });

  useEffect(() => {
    if (!company?.id) return;
    Promise.all([
      fetch(`/api/real-estate/leases-active?company_id=${company.id}`).then(r => r.json()),
      createClient().from('companies').select('name,logo_url,address,email,phone,primary_color').eq('id', company.id).maybeSingle(),
    ]).then(([leasesRes, { data: c }]) => {
      const data = (leasesRes.data || []) as Lease[];
      setLeases(data);
      setFiltered(data);
      setCompanySettings(c);
      setLoading(false);
    });
  }, [company?.id]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(leases); return; }
    const q = search.toLowerCase();
    setFiltered(leases.filter(l =>
      `${l.tenants?.first_name} ${l.tenants?.last_name}`.toLowerCase().includes(q) ||
      l.properties?.name?.toLowerCase().includes(q) ||
      l.properties?.city?.toLowerCase().includes(q)
    ));
  }, [search, leases]);

  const selectLease = (l: Lease) => {
    setSelectedLease(l);
    setDropOpen(false);
    setSearch('');
  };

  const handleGenerate = async () => {
    if (!selectedLease) { toast.error('Sélectionnez un bail'); return; }
    const t = selectedLease.tenants;
    const p = selectedLease.properties;
    setGenerating(true);
    try {
      await generateTerminationPDF({
        docType,
        tenantName:      t ? `${t.first_name} ${t.last_name}` : '',
        tenantEmail:     t?.email,
        tenantPhone:     t?.phone || undefined,
        propertyName:    p?.name || '',
        propertyAddress: p ? `${p.address}, ${p.city}` : '',
        startDate:       new Date(selectedLease.start_date).toLocaleDateString('fr-FR'),
        endDate:         new Date(selectedLease.end_date).toLocaleDateString('fr-FR'),
        terminationDate: new Date(form.terminationDate).toLocaleDateString('fr-FR'),
        rentAmount:      selectedLease.rent_amount,
        depositReturned: form.depositReturned ? Number(form.depositReturned) : undefined,
        reason:          form.reason || undefined,
        customText:      form.customText || undefined,
        companyName:     companySettings?.name || company?.name || '',
        companyLogoUrl:  companySettings?.logo_url,
        primaryColor:    companySettings?.primary_color || null,
        companyAddress:  companySettings?.address,
        companyEmail:    companySettings?.email,
        companyPhone:    companySettings?.phone,
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
      <div className={cardCls+' p-6'}>
        <h2 className="font-bold text-foreground text-base mb-3">Type de document</h2>
        <div className="grid grid-cols-2 gap-3">
          {DOC_TYPES.map(dt => (
            <button key={dt.id} onClick={() => setDocType(dt.id)}
              className={'p-4 rounded-xl border-2 text-left transition-all '+(
                docType === dt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              )}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{dt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={'font-semibold text-sm '+(docType===dt.id?'text-primary':'text-foreground')}>{dt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dt.desc}</p>
                </div>
                {docType === dt.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={12} className="text-white"/>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sélection bail — dropdown avec recherche */}
      <div className={cardCls+' p-6'}>
        <h2 className="font-bold text-foreground text-base mb-4">Bail concerné</h2>

        {leases.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Aucun bail trouvé. Créez d'abord un contrat de bail.
          </div>
        ) : (
          <div className="relative">
            {/* Trigger */}
            <button onClick={() => setDropOpen(o => !o)} type="button"
              className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left '+(
                dropOpen ? 'border-primary' : 'border-border hover:border-primary/40'
              )}>
              {selectedLease ? (
                <>
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-primary"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {selectedLease.tenants?.first_name} {selectedLease.tenants?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedLease.properties?.name} · {selectedLease.properties?.city}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    selectedLease.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>{selectedLease.status === 'active' ? 'Actif' : selectedLease.status}</span>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Search size={16} className="text-muted-foreground"/>
                  </div>
                  <span className="text-muted-foreground text-sm flex-1">Rechercher un locataire ou un bien...</span>
                </>
              )}
              <ChevronDown size={16} className={'text-muted-foreground transition-transform '+(dropOpen?'rotate-180':'')}/>
            </button>

            {/* Dropdown */}
            {dropOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <Search size={14} className="text-muted-foreground flex-shrink-0"/>
                    <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Nom du locataire, bien, ville..."
                      className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"/>
                  </div>
                </div>
                {/* Liste */}
                <div className="max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-center py-4 text-sm text-muted-foreground">Aucun résultat</p>
                  ) : filtered.map(l => (
                    <button key={l.id} onClick={() => selectLease(l)} type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User size={15} className="text-primary"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">
                          {l.tenants?.first_name} {l.tenants?.last_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Building2 size={10} className="text-muted-foreground"/>
                          <span className="text-xs text-muted-foreground">{l.properties?.name}</span>
                          <Calendar size={10} className="text-muted-foreground ml-1"/>
                          <span className="text-xs text-muted-foreground">
                            {new Date(l.start_date).toLocaleDateString('fr-FR')} → {new Date(l.end_date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-foreground">{formatCurrency(l.rent_amount)}/mois</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          l.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>{l.status === 'active' ? 'Actif' : l.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Récap bail sélectionné */}
        {selectedLease && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 grid grid-cols-2 gap-3">
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
              <p className="text-sm font-bold text-foreground">{formatCurrency(selectedLease.rent_amount)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Détails */}
      <div className={cardCls+' p-6 space-y-4'}>
        <h2 className="font-bold text-foreground text-base">Détails du document</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date de résiliation *</label>
            <input type="date" value={form.terminationDate}
              onChange={e => setForm(f => ({...f, terminationDate: e.target.value}))} className={inputCls}/>
          </div>
          {(docType === 'decharge' || docType === 'attestation_fin') && (
            <div>
              <label className={labelCls}>Dépôt restitué (FCFA)</label>
              <input type="number" value={form.depositReturned}
                onChange={e => setForm(f => ({...f, depositReturned: e.target.value}))}
                placeholder={selectedLease?.deposit_amount?.toString() || '0'} className={inputCls}/>
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Motif</label>
          <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
            placeholder="Ex: Départ volontaire, fin de bail, non-paiement..." className={inputCls}/>
        </div>
        <div>
          <label className={labelCls}>Texte personnalisé (optionnel)</label>
          <textarea value={form.customText} onChange={e => setForm(f => ({...f, customText: e.target.value}))}
            rows={4} placeholder="Laissez vide pour utiliser le modèle automatique..." className={inputCls+' resize-none'}/>
        </div>
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={handleGenerate} disabled={generating || !selectedLease}
          className={btnPrimary+' gap-2 px-8 disabled:opacity-50'}>
          {generating ? <LoadingSpinner size={16}/> : <FileDown size={16}/>}
          Générer le document PDF
        </button>
      </div>
    </div>
  );
}