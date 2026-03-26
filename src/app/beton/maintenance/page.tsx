'use client';
import { useState } from 'react';
import { Wrench, Plus, X, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';

type TypeMaint = 'preventive' | 'corrective' | 'revision';
type StatutMaint = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';

interface Maintenance {
  id: string;
  vehicule: string;
  type: TypeMaint;
  description: string;
  date_planifiee: string;
  date_fin?: string;
  cout?: number;
  prestataire?: string;
  statut: StatutMaint;
  notes?: string;
}

const MOCK: Maintenance[] = [
  { id: '1', vehicule: 'DK-5424-A', type: 'corrective', description: 'Remplacement joint malaxeur + pompe hydraulique', date_planifiee: '2026-03-24', date_fin: undefined, cout: 680000, prestataire: 'Garage Autoroute', statut: 'en_cours', notes: 'Pièces commandées, arrivée prévue 28/03' },
  { id: '2', vehicule: 'DK-5421-A', type: 'preventive', description: 'Vidange + filtres moteur (révision 185.000 km)', date_planifiee: '2026-03-27', cout: 125000, prestataire: 'Mercedes Sénégal', statut: 'planifiee' },
  { id: '3', vehicule: 'DK-5422-A', type: 'revision', description: 'Révision générale 140.000 km', date_planifiee: '2026-04-05', cout: 380000, prestataire: 'Volvo Trucks Dakar', statut: 'planifiee' },
  { id: '4', vehicule: 'DK-5423-A', type: 'preventive', description: 'Graissage châssis et roulements malaxeur', date_planifiee: '2026-03-20', date_fin: '2026-03-20', cout: 45000, statut: 'terminee' },
  { id: '5', vehicule: 'DK-5425-A', type: 'corrective', description: 'Remplacement pneus avant (2 pneus)', date_planifiee: '2026-03-18', date_fin: '2026-03-18', cout: 320000, prestataire: 'Pneus Africa', statut: 'terminee' },
];

const TYPE_CONFIG: Record<TypeMaint, { label: string; color: string; bg: string }> = {
  preventive: { label: 'Préventive', color: '#0ea5e9', bg: '#0ea5e915' },
  corrective: { label: 'Corrective', color: '#ef4444', bg: '#ef444415' },
  revision:   { label: 'Révision',   color: SARPA_PURPLE, bg: SARPA_PURPLE + '15' },
};

const STATUT_CONFIG: Record<StatutMaint, { label: string; color: string; bg: string }> = {
  planifiee: { label: 'Planifiée',  color: '#f59e0b', bg: '#f59e0b15' },
  en_cours:  { label: 'En cours',  color: '#0ea5e9', bg: '#0ea5e915' },
  terminee:  { label: 'Terminée',  color: '#22c55e', bg: '#22c55e15' },
  annulee:   { label: 'Annulée',   color: '#94a3b8', bg: '#94a3b815' },
};

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }

const CAMIONS = ['DK-5421-A', 'DK-5422-A', 'DK-5423-A', 'DK-5424-A', 'DK-5425-A', 'DK-5426-A'];

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicule: 'DK-5421-A', type: 'preventive' as TypeMaint, description: '', date_planifiee: new Date().toISOString().split('T')[0], cout: '', prestataire: '', notes: '' });

  const enCours = maintenances.filter(m => m.statut === 'en_cours');
  const totalCout = maintenances.filter(m => m.statut === 'terminee' && m.cout).reduce((s, m) => s + (m.cout || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setMaintenances(prev => [{
      id: Date.now().toString(), vehicule: form.vehicule, type: form.type, description: form.description,
      date_planifiee: form.date_planifiee, cout: form.cout ? Number(form.cout) : undefined,
      prestataire: form.prestataire || undefined, statut: 'planifiee', notes: form.notes || undefined,
    }, ...prev]);
    setForm({ vehicule: 'DK-5421-A', type: 'preventive', description: '', date_planifiee: new Date().toISOString().split('T')[0], cout: '', prestataire: '', notes: '' });
    setShowForm(false); setSaving(false);
  }

  function advance(id: string) {
    const flow: StatutMaint[] = ['planifiee', 'en_cours', 'terminee'];
    setMaintenances(prev => prev.map(m => {
      if (m.id !== id) return m;
      const idx = flow.indexOf(m.statut);
      if (idx < 0 || idx >= flow.length - 1) return m;
      return { ...m, statut: flow[idx + 1], date_fin: flow[idx + 1] === 'terminee' ? new Date().toISOString().split('T')[0] : m.date_fin };
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
          <Wrench size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Entretien et réparations flotte SARPA Béton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Planifier maintenance
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En cours', value: enCours.length, color: '#0ea5e9' },
          { label: 'Planifiées', value: maintenances.filter(m => m.statut === 'planifiee').length, color: '#f59e0b' },
          { label: 'Coût total (terminées)', value: fmt(totalCout) + ' F', color: SARPA_PURPLE },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {enCours.length > 0 && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{ background: '#0ea5e910', borderColor: '#0ea5e930' }}>
          <Clock size={18} style={{ color: '#0ea5e9' }} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-bold" style={{ color: '#0284c7' }}>
            {enCours.length} maintenance(s) en cours : {enCours.map(m => m.vehicule).join(', ')}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {maintenances.map(m => {
          const t = TYPE_CONFIG[m.type];
          const s = STATUT_CONFIG[m.statut];
          const canAdvance = ['planifiee', 'en_cours'].includes(m.statut);
          return (
            <div key={m.id} className={cardCls + ' p-5'}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.bg }}>
                  <Wrench size={18} style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm font-black text-foreground">{m.vehicule}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: t.bg, color: t.color }}>{t.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{m.description}</p>
                  <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span>📅 Planifiée: {m.date_planifiee}</span>
                    {m.date_fin && <span>✅ Terminée: {m.date_fin}</span>}
                    {m.prestataire && <span>🔧 {m.prestataire}</span>}
                    {m.cout && <span className="font-bold" style={{ color: SARPA_PURPLE }}>💰 {fmt(m.cout)} F</span>}
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{m.notes}</p>}
                </div>
                {canAdvance && (
                  <button onClick={() => advance(m.id)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition hover:opacity-80" style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>
                    {m.statut === 'planifiee' ? '▶ Démarrer' : '✓ Terminer'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Planifier une maintenance</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Véhicule</label>
                  <select className={selectCls} value={form.vehicule} onChange={e => setForm(p => ({ ...p, vehicule: e.target.value }))}>
                    {CAMIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Type</label>
                  <select className={selectCls} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as TypeMaint }))}>
                    {(Object.keys(TYPE_CONFIG) as TypeMaint[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className={labelCls}>Description</label><input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required /></div>
                <div><label className={labelCls}>Date planifiée</label><input type="date" className={inputCls} value={form.date_planifiee} onChange={e => setForm(p => ({ ...p, date_planifiee: e.target.value }))} required /></div>
                <div><label className={labelCls}>Coût estimé (F)</label><input type="number" min="0" className={inputCls} value={form.cout} onChange={e => setForm(p => ({ ...p, cout: e.target.value }))} /></div>
                <div className="col-span-2"><label className={labelCls}>Prestataire</label><input className={inputCls} value={form.prestataire} onChange={e => setForm(p => ({ ...p, prestataire: e.target.value }))} /></div>
                <div className="col-span-2"><label className={labelCls}>Notes</label><textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enreg...</> : <><CheckCircle2 size={14} /> Planifier</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
