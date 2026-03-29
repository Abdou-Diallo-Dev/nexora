'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getNavItems } from '@/lib/permissions';
import { UserRole } from '@/lib/store';
import { Building2, Truck, Factory, Lock, Check, Save, ChevronDown, Layers } from 'lucide-react';

type Feature = { key: string; label: string; group: string };
type ModuleKey = 'real_estate' | 'logistics' | 'beton';

const RE_FEATURES: Feature[] = [
  { key: 'properties',     label: 'Biens immobiliers',       group: 'Biens' },
  { key: 'apartments',     label: 'Appartements',            group: 'Biens' },
  { key: 'tenants',        label: 'Locataires',              group: 'Biens' },
  { key: 'notices',        label: 'Preavis & sorties',       group: 'Biens' },
  { key: 'leases',         label: 'Contrats de bail',        group: 'Biens' },
  { key: 'inspections',    label: 'Etats des lieux',         group: 'Biens' },
  { key: 'terminations',   label: 'Resiliations',            group: 'Biens' },
  { key: 'convention',     label: 'Conventions',             group: 'Biens' },
  { key: 'payments',       label: 'Loyers',                  group: 'Paiements' },
  { key: 'onlinePayment',  label: 'Paiement en ligne',       group: 'Paiements' },
  { key: 'expenses',       label: 'Depenses',                group: 'Paiements' },
  { key: 'accounting',     label: 'Comptabilite',            group: 'Paiements' },
  { key: 'disbursements',  label: 'Reversements',            group: 'Paiements' },
  { key: 'maintenance',    label: 'Signalements',            group: 'Locataires' },
  { key: 'notifications',  label: 'Messagerie locataires',   group: 'Locataires' },
  { key: 'weeklyOutings',  label: 'Sorties hebdomadaires',   group: 'Activites' },
  { key: 'analytics',      label: 'Analyse financiere',      group: 'Analyse' },
  { key: 'stats',          label: 'Statistiques',            group: 'Analyse' },
  { key: 'reports',        label: 'Rapports financiers',     group: 'Analyse' },
  { key: 'reports-terrain',label: 'Rapports terrain',        group: 'Analyse' },
  { key: 'documents',      label: 'Documents PDF',           group: 'Documents' },
  { key: 'contractTemplate',label: 'Modeles de contrat',     group: 'Documents' },
  { key: 'messages',       label: 'Messagerie',              group: 'Documents' },
];

const LOG_FEATURES: Feature[] = [
  { key: 'fleet',       label: 'Camions & vehicules',    group: 'Flotte' },
  { key: 'drivers',     label: 'Chauffeurs',             group: 'Flotte' },
  { key: 'gps',         label: 'Suivi GPS',              group: 'Flotte' },
  { key: 'maintenance', label: 'Suivi entretien',        group: 'Maintenance' },
  { key: 'accidents',   label: 'Accidents & incidents',  group: 'Maintenance' },
  { key: 'stockmaint',  label: 'Stock maintenance',      group: 'Stock' },
  { key: 'stockvente',  label: 'Stock commercial',       group: 'Stock' },
  { key: 'deliveries',  label: 'Livraisons',             group: 'Operations' },
  { key: 'orders',      label: 'Commandes clients',      group: 'Commercial' },
  { key: 'clients',     label: 'Clients',                group: 'Commercial' },
  { key: 'fournisseurs',label: 'Fournisseurs',           group: 'Commercial' },
  { key: 'employes',    label: 'Employes',               group: 'RH' },
  { key: 'rapsorties',  label: 'Sorties vehicules',      group: 'RH' },
  { key: 'finances',    label: 'Comptes & banques',      group: 'Finance' },
  { key: 'budget',      label: 'Budget mensuel',         group: 'Finance' },
  { key: 'dettes',      label: 'Dettes clients',         group: 'Finance' },
  { key: 'factures',    label: 'Factures clients',       group: 'Facturation' },
  { key: 'annuaire',    label: 'Contacts & annuaire',    group: 'Annuaire' },
  { key: 'stats',       label: 'Statistiques',           group: 'Rapports' },
  { key: 'rapports',    label: 'Rapports financiers',    group: 'Rapports' },
  { key: 'documents',   label: 'Documents & PDF',        group: 'Rapports' },
];

const BETON_FEATURES: Feature[] = [
  { key: 'production',  label: 'Suivi production',       group: 'Production' },
  { key: 'qualite',     label: 'Controle qualite',       group: 'Production' },
  { key: 'planning',    label: 'Planning',               group: 'Production' },
  { key: 'matieres',    label: 'Matieres premieres',     group: 'Stock' },
  { key: 'produits',    label: 'Produits finis',         group: 'Stock' },
  { key: 'commandes',   label: 'Commandes',              group: 'Commercial' },
  { key: 'livraisons',  label: 'Livraisons',             group: 'Commercial' },
  { key: 'clients',     label: 'Clients',                group: 'Commercial' },
  { key: 'factures',    label: 'Factures',               group: 'Commercial' },
  { key: 'flotte',      label: 'Flotte camions',         group: 'Flotte' },
  { key: 'maintenance', label: 'Maintenance machines',   group: 'Flotte' },
  { key: 'accidents',   label: 'Accidents',              group: 'Flotte' },
  { key: 'finance',     label: 'Finance',                group: 'Finance' },
  { key: 'dettes',      label: 'Dettes',                 group: 'Finance' },
  { key: 'employes',    label: 'Employes',               group: 'Finance' },
  { key: 'stats',       label: 'Statistiques',           group: 'Rapports' },
  { key: 'rapports',    label: 'Rapports',               group: 'Rapports' },
  { key: 'documents',   label: 'Documents PDF',          group: 'Rapports' },
];

const MODULE_FEATURES: Record<ModuleKey, Feature[]> = {
  real_estate: RE_FEATURES,
  logistics:   LOG_FEATURES,
  beton:       BETON_FEATURES,
};

const MODULE_ROLES: Record<ModuleKey, string[]> = {
  real_estate: ['manager', 'agent', 'comptable', 'coordinatrice', 'viewer', 'responsable_operations'],
  logistics:   ['manager_logistique', 'caissiere', 'responsable_vente', 'assistante_admin'],
  beton:       ['manager_beton', 'responsable_production', 'operateur_centrale', 'assistante_commerciale', 'responsable_qualite'],
};

const ROLE_LABELS: Record<string, string> = {
  manager:                 'Manager',
  agent:                   'Agent',
  comptable:               'Comptable',
  coordinatrice:           'Coordinatrice',
  viewer:                  'Lecteur',
  responsable_operations:  'Resp. Operations',
  manager_logistique:      'Manager Log.',
  caissiere:               'Caissiere',
  responsable_vente:       'Resp. Vente',
  assistante_admin:        'Assist. Admin',
  manager_beton:           'Manager Beton',
  responsable_production:  'Resp. Production',
  operateur_centrale:      'Operateur',
  assistante_commerciale:  'Assist. Commerciale',
  responsable_qualite:     'Resp. Qualite',
};

const MODULE_INFO: Record<ModuleKey, { label: string; icon: React.ReactNode }> = {
  real_estate: { label: 'Immobilier', icon: <Building2 size={14} /> },
  logistics:   { label: 'Logistique', icon: <Truck size={14} /> },
  beton:       { label: 'Beton',      icon: <Factory size={14} /> },
};

export default function ModulesPage() {
  const [companies, setCompanies]     = useState<any[]>([]);
  const [companyId, setCompanyId]     = useState('');
  const [company, setCompany]         = useState<any>(null);
  const [module, setModule]           = useState<ModuleKey>('real_estate');
  const [role, setRole]               = useState('');
  const [navAccess, setNavAccess]     = useState<Record<string, Record<string, string[]>>>({});
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    createClient()
      .from('companies')
      .select('id, name, modules, settings')
      .order('name')
      .then(({ data }) => { if (data) setCompanies(data); });
  }, []);

  useEffect(() => {
    const co = companies.find(c => c.id === companyId);
    setCompany(co || null);
    setNavAccess(co?.settings?.nav_access || {});
    const mods: string[] = co?.modules || [];
    const first: ModuleKey = mods.includes('real_estate') ? 'real_estate'
      : mods.includes('logistics') ? 'logistics'
      : 'beton';
    setModule(first);
  }, [companyId, companies]);

  useEffect(() => {
    const roles = MODULE_ROLES[module] || [];
    setRole(roles[0] || '');
  }, [module]);

  const isDefault  = (key: string) => getNavItems(role as UserRole).includes(key);
  const isOverride = (key: string) => (navAccess[module]?.[key] || []).includes(role);

  const toggle = (key: string) => {
    if (isDefault(key)) return;
    setNavAccess(prev => {
      const mAccess = { ...(prev[module] || {}) };
      const current = mAccess[key] || [];
      if (current.includes(role)) {
        const updated = current.filter(r => r !== role);
        if (updated.length === 0) {
          const next = { ...mAccess };
          delete next[key];
          return { ...prev, [module]: next };
        }
        return { ...prev, [module]: { ...mAccess, [key]: updated } };
      }
      return { ...prev, [module]: { ...mAccess, [key]: [...current, role] } };
    });
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const co = companies.find(c => c.id === companyId);
    const newSettings = { ...(co?.settings || {}), nav_access: navAccess };
    await createClient()
      .from('companies')
      .update({ settings: newSettings } as any)
      .eq('id', companyId);
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, settings: newSettings } : c));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const companyModules = (company?.modules || []) as string[];
  const features       = MODULE_FEATURES[module] || [];
  const groups         = Array.from(new Set(features.map(f => f.group)));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Layers size={22} className="text-primary" /> Acces Modules
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Activez des fonctionnalites supplementaires par role pour chaque filiale.
        </p>
      </div>

      {/* Company selector */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Filiale
        </label>
        <div className="relative">
          <select
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— Choisir une filiale —</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {company && (
        <>
          {/* Module tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['real_estate', 'logistics', 'beton'] as ModuleKey[])
              .filter(m => companyModules.includes(m))
              .map(m => {
                const info = MODULE_INFO[m];
                const active = module === m;
                return (
                  <button key={m} onClick={() => setModule(m)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                    style={active
                      ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderColor: 'hsl(var(--primary))' }
                      : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }
                    }>
                    {info.icon} {info.label}
                  </button>
                );
              })}
          </div>

          {/* Role pills */}
          <div className="flex gap-2 flex-wrap">
            {MODULE_ROLES[module].map(r => {
              const active = role === r;
              return (
                <button key={r} onClick={() => setRole(r)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={active
                    ? { background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.35)' }
                    : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }
                  }>
                  {ROLE_LABELS[r] || r}
                </button>
              );
            })}
          </div>

          {/* Feature groups */}
          {role && groups.map(group => {
            const groupFeatures = features.filter(f => f.group === group);
            return (
              <div key={group} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-2.5 border-b border-border bg-muted/30">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group}</h3>
                </div>
                <div className="divide-y divide-border">
                  {groupFeatures.map(f => {
                    const dflt     = isDefault(f.key);
                    const override = isOverride(f.key);
                    return (
                      <div
                        key={f.key}
                        onClick={() => !dflt && toggle(f.key)}
                        className={'flex items-center justify-between px-5 py-3.5 transition-colors ' +
                          (dflt ? 'opacity-55' : 'cursor-pointer hover:bg-muted/25')}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{f.label}</p>
                          {dflt && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Lock size={9} /> Acces par defaut
                            </p>
                          )}
                        </div>

                        {dflt ? (
                          /* locked default badge */
                          <div className="flex items-center justify-center w-6 h-6 rounded-full"
                            style={{ background: 'hsl(var(--primary) / 0.15)' }}>
                            <Check size={11} style={{ color: 'hsl(var(--primary))' }} />
                          </div>
                        ) : (
                          /* toggle switch */
                          <div className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                            style={{ background: override ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}>
                            <div
                              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                              style={{ left: override ? '22px' : '2px' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Save */}
          <div className="flex justify-end pb-6">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'hsl(var(--primary))' }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <Check size={15} />
              ) : (
                <Save size={15} />
              )}
              {saved ? 'Sauvegarde !' : 'Sauvegarder'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
