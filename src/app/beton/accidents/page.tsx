'use client';
import { useState } from 'react';
import { ShieldAlert, Plus, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';

type TypeIncident = 'accident_vehicule' | 'accident_travail' | 'incident_qualite' | 'incident_securite' | 'autre';
type Gravite = 'mineur' | 'modere' | 'grave' | 'critique';
type StatutIncident = 'ouvert' | 'en_investigation' | 'clos';

interface Incident {
  id: string;
  date: string;
  type: TypeIncident;
  gravite: Gravite;
  description: string;
  vehicule?: string;
  victime?: string;
  lieu: string;
  cout_estime?: number;
  statut: StatutIncident;
  actions_correctives?: string;
}

const MOCK: Incident[] = [
  { id: '1', date: '2026-03-15', type: 'accident_vehicule', gravite: 'modere', description: 'Collision légère DK-5424-A avec véhicule tiers sur VDN', vehicule: 'DK-5424-A', lieu: 'VDN Dakar — sens AIBD', cout_estime: 450000, statut: 'en_investigation', actions_correctives: 'Constat amiable établi. Dossier assurance en cours.' },
  { id: '2', date: '2026-02-28', type: 'incident_qualite', gravite: 'grave', description: 'Gâchée G-2026-035 non conforme — résistance insuffisante à 7 jours', lieu: 'Centrale de production', statut: 'clos', actions_correctives: 'Révision procédure de dosage. Formation opérateur réalisée. Béton rejeté et remplacé.' },
  { id: '3', date: '2026-01-10', type: 'accident_travail', gravite: 'mineur', description: 'Chute de plain-pied opérateur lors nettoyage toupie', victime: 'Ibrahim Sow', lieu: 'Zone lavage', statut: 'clos', actions_correctives: 'Pose de revêtement antidérapant. ITT 3 jours.' },
];

const TYPE_CONFIG: Record<TypeIncident, { label: string }> = {
  accident_vehicule:  { label: 'Accident véhicule' },
  accident_travail:   { label: 'Accident du travail' },
  incident_qualite:   { label: 'Incident qualité' },
  incident_securite:  { label: 'Incident sécurité' },
  autre:              { label: 'Autre' },
};

const GRAVITE_CONFIG: Record<Gravite, { label: string; color: string; bg: string }> = {
  mineur:   { label: 'Mineur',   color: '#22c55e', bg: '#22c55e15' },
  modere:   { label: 'Modéré',   color: '#f59e0b', bg: '#f59e0b15' },
  grave:    { label: 'Grave',    color: '#ef4444', bg: '#ef444415' },
  critique: { label: 'Critique', color: '#7f1d1d', bg: '#ef444430' },
};

const STATUT_CONFIG: Record<StatutIncident, { label: string; color: string; bg: string }> = {
  ouvert:           { label: 'Ouvert',           color: '#ef4444', bg: '#ef444415' },
  en_investigation: { label: 'Investigation',    color: '#f59e0b', bg: '#f59e0b15' },
  clos:             { label: 'Clos',             color: '#22c55e', bg: '#22c55e15' },
};

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }

export default function AccidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'accident_vehicule' as TypeIncident, gravite: 'mineur' as Gravite, description: '', vehicule: '', victime: '', lieu: '', cout_estime: '', actions_correctives: '' });

  const ouverts = incidents.filter(i => i.statut !== 'clos').length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setIncidents(prev => [{
      id: Date.now().toString(), date: form.date, type: form.type, gravite: form.gravite,
      description: form.description, vehicule: form.vehicule || undefined, victime: form.victime || undefined,
      lieu: form.lieu, cout_estime: form.cout_estime ? Number(form.cout_estime) : undefined,
      statut: 'ouvert', actions_correctives: form.actions_correctives || undefined,
    }, ...prev]);
    setForm({ date: new Date().toISOString().split('T')[0], type: 'accident_vehicule', gravite: 'mineur', description: '', vehicule: '', victime: '', lieu: '', cout_estime: '', actions_correctives: '' });
    setShowForm(false); setSaving(false);
  }

  function advanceStatut(id: string) {
    const flow: StatutIncident[] = ['ouvert', 'en_investigation', 'clos'];
    setIncidents(prev => prev.map(i => {
      if (i.id !== id) return i;
      const idx = flow.indexOf(i.statut);
      if (idx < 0 || idx >= flow.length - 1) return i;
      return { ...i, statut: flow[idx + 1] };
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
          <ShieldAlert size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Accidents & Incidents</h1>
          <p className="text-sm text-muted-foreground">Registre sécurité SARPA Béton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Déclarer un incident
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total incidents', value: incidents.length },
          { label: 'Ouverts', value: ouverts, color: '#ef4444' },
          { label: 'Graves / Critiques', value: incidents.filter(i => ['grave', 'critique'].includes(i.gravite)).length, color: '#ef4444' },
          { label: 'Clos', value: incidents.filter(i => i.statut === 'clos').length, color: '#22c55e' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-4'}>
            <p className="text-2xl font-black" style={{ color: k.color || 'var(--foreground)' }}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {ouverts > 0 && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{ background: '#ef444410', borderColor: '#ef444430' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
            {ouverts} incident(s) en cours de traitement — action requise
          </p>
        </div>
      )}

      <div className="space-y-4">
        {incidents.map(i => {
          const g = GRAVITE_CONFIG[i.gravite];
          const s = STATUT_CONFIG[i.statut];
          const t = TYPE_CONFIG[i.type];
          const canAdvance = i.statut !== 'clos';
          return (
            <div key={i.id} className={cardCls + ' p-5'}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: g.bg }}>
                  <ShieldAlert size={18} style={{ color: g.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-muted-foreground text-xs">{i.date}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: g.bg, color: g.color }}>{g.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-muted-foreground">{t.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{i.description}</p>
                  <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span>📍 {i.lieu}</span>
                    {i.vehicule && <span>🚛 {i.vehicule}</span>}
                    {i.victime && <span>👤 {i.victime}</span>}
                    {i.cout_estime && <span className="font-bold" style={{ color: '#ef4444' }}>💰 {fmt(i.cout_estime)} F</span>}
                  </div>
                  {i.actions_correctives && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Actions : </span>{i.actions_correctives}
                    </div>
                  )}
                </div>
                {canAdvance && (
                  <button onClick={() => advanceStatut(i.id)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-80" style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>
                    {i.statut === 'ouvert' ? '→ Investigation' : '✓ Clôturer'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {incidents.length === 0 && (
          <div className={cardCls + ' py-12 text-center'}>
            <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: '#22c55e', opacity: 0.5 }} />
            <p className="text-sm text-muted-foreground">Aucun incident enregistré</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
              <h3 className="font-bold text-foreground">Déclarer un incident</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required /></div>
                <div><label className={labelCls}>Type</label>
                  <select className={selectCls} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as TypeIncident }))}>
                    {(Object.keys(TYPE_CONFIG) as TypeIncident[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Gravité</label>
                  <select className={selectCls} value={form.gravite} onChange={e => setForm(p => ({ ...p, gravite: e.target.value as Gravite }))}>
                    {(Object.keys(GRAVITE_CONFIG) as Gravite[]).map(g => <option key={g} value={g}>{GRAVITE_CONFIG[g].label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Lieu</label><input className={inputCls} value={form.lieu} onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))} required /></div>
                <div className="col-span-2"><label className={labelCls}>Description</label><textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required /></div>
                <div><label className={labelCls}>Véhicule (si applicable)</label><input className={inputCls} value={form.vehicule} onChange={e => setForm(p => ({ ...p, vehicule: e.target.value }))} /></div>
                <div><label className={labelCls}>Victime</label><input className={inputCls} value={form.victime} onChange={e => setForm(p => ({ ...p, victime: e.target.value }))} /></div>
                <div><label className={labelCls}>Coût estimé (F)</label><input type="number" min="0" className={inputCls} value={form.cout_estime} onChange={e => setForm(p => ({ ...p, cout_estime: e.target.value }))} /></div>
                <div className="col-span-2"><label className={labelCls}>Actions correctives</label><textarea className={inputCls} rows={2} value={form.actions_correctives} onChange={e => setForm(p => ({ ...p, actions_correctives: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enreg...</> : <><CheckCircle2 size={14} /> Déclarer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
