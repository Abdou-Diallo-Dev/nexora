'use client';
import { useState } from 'react';
import { Truck, Plus, X, Loader2, CheckCircle2, AlertTriangle, Wrench, Fuel } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

type EtatCamion = 'disponible' | 'en_mission' | 'en_maintenance' | 'hors_service';
type TypeCamion = 'malaxeur' | 'pompe' | 'camion_benne' | 'autre';

interface Camion {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type: TypeCamion;
  capacite_m3?: number;
  annee: number;
  etat: EtatCamion;
  chauffeur_attitré?: string;
  km_total?: number;
  derniere_vidange_km?: number;
  prochaine_visite?: string;
  assurance_expire?: string;
  visite_technique_expire?: string;
}

const MOCK: Camion[] = [
  { id: '1', immatriculation: 'DK-5421-A', marque: 'Mercedes', modele: 'Axor 3240', type: 'malaxeur', capacite_m3: 9, annee: 2019, etat: 'disponible', chauffeur_attitré: 'Pape Ndiaye', km_total: 187500, derniere_vidange_km: 185000, prochaine_visite: '2026-06-15', assurance_expire: '2026-12-31', visite_technique_expire: '2026-09-10' },
  { id: '2', immatriculation: 'DK-5422-A', marque: 'Volvo', modele: 'FM400', type: 'malaxeur', capacite_m3: 8, annee: 2020, etat: 'en_mission', chauffeur_attitré: 'Modou Fall', km_total: 142300, derniere_vidange_km: 140000, prochaine_visite: '2026-08-01', assurance_expire: '2026-12-31', visite_technique_expire: '2026-11-20' },
  { id: '3', immatriculation: 'DK-5423-A', marque: 'Scania', modele: 'R410', type: 'malaxeur', capacite_m3: 10, annee: 2021, etat: 'disponible', chauffeur_attitré: 'Ibrahima Sow', km_total: 98200, prochaine_visite: '2026-10-05', assurance_expire: '2026-12-31', visite_technique_expire: '2027-01-15' },
  { id: '4', immatriculation: 'DK-5424-A', marque: 'Mercedes', modele: 'Axor 2640', type: 'malaxeur', capacite_m3: 9, annee: 2018, etat: 'en_maintenance', chauffeur_attitré: 'Mamadou Ba', km_total: 224100, derniere_vidange_km: 220000, prochaine_visite: '2026-04-01', assurance_expire: '2026-12-31', visite_technique_expire: '2026-05-30' },
  { id: '5', immatriculation: 'DK-5425-A', marque: 'Renault', modele: 'Kerax 340', type: 'camion_benne', annee: 2017, etat: 'disponible', km_total: 312000, prochaine_visite: '2026-04-15', assurance_expire: '2026-12-31', visite_technique_expire: '2026-04-20' },
  { id: '6', immatriculation: 'DK-5426-A', marque: 'Putzmeister', modele: 'M36', type: 'pompe', annee: 2022, etat: 'disponible', prochaine_visite: '2026-12-01', assurance_expire: '2026-12-31' },
];

const ETAT_CONFIG: Record<EtatCamion, { label: string; bg: string; color: string; dot: string }> = {
  disponible:     { label: 'Disponible',     bg: '#22c55e15', color: '#22c55e', dot: '#22c55e' },
  en_mission:     { label: 'En mission',     bg: '#f59e0b15', color: '#f59e0b', dot: '#f59e0b' },
  en_maintenance: { label: 'En maintenance', bg: SARPA_PURPLE + '15', color: SARPA_PURPLE, dot: SARPA_PURPLE },
  hors_service:   { label: 'Hors service',   bg: '#ef444415', color: '#ef4444', dot: '#ef4444' },
};

const TYPE_LABEL: Record<TypeCamion, string> = {
  malaxeur: 'Malaxeur (toupie)',
  pompe: 'Pompe à béton',
  camion_benne: 'Camion benne',
  autre: 'Autre',
};

export default function FlottePage() {
  const [camions, setCamions] = useState<Camion[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Camion | null>(null);
  const [form, setForm] = useState({ immatriculation: '', marque: '', modele: '', type: 'malaxeur' as TypeCamion, capacite_m3: '', annee: new Date().getFullYear().toString(), chauffeur_attitré: '', assurance_expire: '', visite_technique_expire: '' });

  const today = new Date().toISOString().split('T')[0];
  const alertes = camions.filter(c =>
    (c.visite_technique_expire && c.visite_technique_expire < new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
    || c.etat === 'en_maintenance'
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setCamions(prev => [...prev, {
      id: Date.now().toString(), immatriculation: form.immatriculation, marque: form.marque,
      modele: form.modele, type: form.type, capacite_m3: form.capacite_m3 ? Number(form.capacite_m3) : undefined,
      annee: Number(form.annee), etat: 'disponible', chauffeur_attitré: form.chauffeur_attitré || undefined,
      assurance_expire: form.assurance_expire || undefined, visite_technique_expire: form.visite_technique_expire || undefined,
    }]);
    setForm({ immatriculation: '', marque: '', modele: '', type: 'malaxeur', capacite_m3: '', annee: new Date().getFullYear().toString(), chauffeur_attitré: '', assurance_expire: '', visite_technique_expire: '' });
    setShowForm(false); setSaving(false);
  }

  function cycleEtat(id: string) {
    const cycle: EtatCamion[] = ['disponible', 'en_mission', 'en_maintenance', 'hors_service'];
    setCamions(prev => prev.map(c => {
      if (c.id !== id) return c;
      const idx = cycle.indexOf(c.etat);
      return { ...c, etat: cycle[(idx + 1) % cycle.length] };
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
          <Truck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Flotte Véhicules</h1>
          <p className="text-sm text-muted-foreground">Toupies, pompes et engins SARPA Béton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Ajouter véhicule
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {([
          { label: 'Flotte totale', value: camions.length, color: 'var(--foreground)' },
          { label: 'Disponibles', value: camions.filter(c => c.etat === 'disponible').length, color: '#22c55e' },
          { label: 'En mission', value: camions.filter(c => c.etat === 'en_mission').length, color: '#f59e0b' },
          { label: 'En maintenance', value: camions.filter(c => c.etat === 'en_maintenance').length, color: SARPA_PURPLE },
        ] as const).map(k => (
          <div key={k.label} className={cardCls + ' p-4'}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {alertes.length > 0 && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{ background: SARPA_YELLOW + '15', borderColor: SARPA_YELLOW + '40' }}>
          <AlertTriangle size={18} style={{ color: SARPA_YELLOW }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold" style={{ color: '#92400e' }}>{alertes.length} véhicule(s) nécessitent attention</p>
            <p className="text-xs mt-0.5 text-amber-800">{alertes.map(a => a.immatriculation).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {camions.map(c => {
          const e = ETAT_CONFIG[c.etat];
          const vtExpire = c.visite_technique_expire && c.visite_technique_expire < new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
          return (
            <div key={c.id} className={cardCls + ' p-5 cursor-pointer hover:shadow-md transition-shadow'} onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-lg font-black text-foreground">{c.immatriculation}</p>
                  <p className="text-sm text-muted-foreground">{c.marque} {c.modele} • {c.annee}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: e.bg, color: e.color }}>{e.label}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{TYPE_LABEL[c.type]}</span>
                </div>
                {c.capacite_m3 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Capacité</span>
                    <span className="font-bold" style={{ color: SARPA_PURPLE }}>{c.capacite_m3} M3</span>
                  </div>
                )}
                {c.chauffeur_attitré && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Chauffeur</span>
                    <span className="font-medium text-foreground">{c.chauffeur_attitré}</span>
                  </div>
                )}
                {c.km_total && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Kilométrage</span>
                    <span className="font-medium text-foreground">{new Intl.NumberFormat('fr-FR').format(c.km_total)} km</span>
                  </div>
                )}
              </div>
              {(vtExpire || c.etat === 'en_maintenance') && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-xs" style={{ color: SARPA_YELLOW }}>
                  <AlertTriangle size={11} />
                  {c.etat === 'en_maintenance' ? 'En cours de maintenance' : `Visite technique expire ${c.visite_technique_expire}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fiche véhicule */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Fiche véhicule — {selected.immatriculation}</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-2xl text-foreground font-mono">{selected.immatriculation}</p>
                  <p className="text-muted-foreground">{selected.marque} {selected.modele} ({selected.annee})</p>
                </div>
                <button onClick={() => { cycleEtat(selected.id); setSelected(prev => prev ? { ...prev, etat: (() => { const cycle: EtatCamion[] = ['disponible', 'en_mission', 'en_maintenance', 'hors_service']; const idx = cycle.indexOf(prev.etat); return cycle[(idx + 1) % cycle.length]; })() } : null); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80" style={{ background: ETAT_CONFIG[selected.etat].bg, color: ETAT_CONFIG[selected.etat].color }}>
                  {ETAT_CONFIG[selected.etat].label} ↻
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Type', value: TYPE_LABEL[selected.type] },
                  { label: 'Capacité', value: selected.capacite_m3 ? selected.capacite_m3 + ' M3' : '—' },
                  { label: 'Chauffeur', value: selected.chauffeur_attitré || '—' },
                  { label: 'Kilométrage', value: selected.km_total ? new Intl.NumberFormat('fr-FR').format(selected.km_total) + ' km' : '—' },
                  { label: 'Assurance', value: selected.assurance_expire || '—' },
                  { label: 'Visite technique', value: selected.visite_technique_expire || '—' },
                  { label: 'Prochaine visite', value: selected.prochaine_visite || '—' },
                ].map(row => (
                  <div key={row.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="font-semibold text-foreground mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ajouter véhicule */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
              <h3 className="font-bold text-foreground">Nouveau véhicule</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Immatriculation</label><input className={inputCls} value={form.immatriculation} onChange={e => setForm(p => ({ ...p, immatriculation: e.target.value }))} required placeholder="DK-5427-A" /></div>
                <div><label className={labelCls}>Année</label><input type="number" min="2000" max="2030" className={inputCls} value={form.annee} onChange={e => setForm(p => ({ ...p, annee: e.target.value }))} required /></div>
                <div><label className={labelCls}>Marque</label><input className={inputCls} value={form.marque} onChange={e => setForm(p => ({ ...p, marque: e.target.value }))} required /></div>
                <div><label className={labelCls}>Modèle</label><input className={inputCls} value={form.modele} onChange={e => setForm(p => ({ ...p, modele: e.target.value }))} required /></div>
                <div><label className={labelCls}>Type</label>
                  <select className={selectCls} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as TypeCamion }))}>
                    {(Object.keys(TYPE_LABEL) as TypeCamion[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Capacité (M3)</label><input type="number" min="0" className={inputCls} value={form.capacite_m3} onChange={e => setForm(p => ({ ...p, capacite_m3: e.target.value }))} /></div>
                <div className="col-span-2"><label className={labelCls}>Chauffeur attitré</label><input className={inputCls} value={form.chauffeur_attitré} onChange={e => setForm(p => ({ ...p, chauffeur_attitré: e.target.value }))} /></div>
                <div><label className={labelCls}>Assurance expire</label><input type="date" className={inputCls} value={form.assurance_expire} onChange={e => setForm(p => ({ ...p, assurance_expire: e.target.value }))} /></div>
                <div><label className={labelCls}>Visite technique expire</label><input type="date" className={inputCls} value={form.visite_technique_expire} onChange={e => setForm(p => ({ ...p, visite_technique_expire: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enreg...</> : <><CheckCircle2 size={14} /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
