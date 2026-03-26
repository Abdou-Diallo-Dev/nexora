'use client';
import { useState } from 'react';
import { Truck, Plus, X, Loader2, CheckCircle2, Clock, MapPin, Search } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

type StatutLivraison = 'planifiee' | 'en_cours' | 'livree' | 'annulee';

interface Livraison {
  id: string;
  bon_livraison: string;
  commande_ref: string;
  client: string;
  chantier: string;
  beton_type: string;
  quantite_m3: number;
  chauffeur: string;
  camion: string;
  heure_depart?: string;
  heure_arrivee?: string;
  date: string;
  statut: StatutLivraison;
  distance_km?: number;
}

const MOCK: Livraison[] = [
  { id: '1', bon_livraison: 'BL-2026-089', commande_ref: 'CMD-2026-042', client: 'Groupe Diallo Construction', chantier: 'Villa Almadies', beton_type: 'B25', quantite_m3: 8, chauffeur: 'Pape Ndiaye', camion: 'DK-5421-A', heure_depart: '07:30', heure_arrivee: '08:15', date: '2026-03-26', statut: 'livree', distance_km: 22 },
  { id: '2', bon_livraison: 'BL-2026-090', commande_ref: 'CMD-2026-042', client: 'Groupe Diallo Construction', chantier: 'Villa Almadies', beton_type: 'B25', quantite_m3: 7, chauffeur: 'Modou Fall', camion: 'DK-5422-A', heure_depart: '09:00', date: '2026-03-26', statut: 'en_cours', distance_km: 22 },
  { id: '3', bon_livraison: 'BL-2026-091', commande_ref: 'CMD-2026-041', client: 'BTP Senegal SA', chantier: 'Immeuble Plateau', beton_type: 'B30', quantite_m3: 12, chauffeur: 'Ibrahima Sow', camion: 'DK-5423-A', date: '2026-03-26', statut: 'planifiee', distance_km: 15 },
  { id: '4', bon_livraison: 'BL-2026-092', commande_ref: 'CMD-2026-041', client: 'BTP Senegal SA', chantier: 'Immeuble Plateau', beton_type: 'B30', quantite_m3: 12, chauffeur: 'Mamadou Ba', camion: 'DK-5424-A', date: '2026-03-26', statut: 'planifiee', distance_km: 15 },
  { id: '5', bon_livraison: 'BL-2026-088', commande_ref: 'CMD-2026-040', client: 'Immobilier Futur', chantier: 'Residence Grand Yoff', beton_type: 'B25', quantite_m3: 10, chauffeur: 'Pape Ndiaye', camion: 'DK-5421-A', heure_depart: '06:00', heure_arrivee: '06:45', date: '2026-03-25', statut: 'livree', distance_km: 8 },
];

const STATUT_CONFIG: Record<StatutLivraison, { label: string; bg: string; color: string }> = {
  planifiee: { label: 'Planifiee', bg: '#3d2d7d15', color: '#3d2d7d' },
  en_cours:  { label: 'En cours',  bg: '#f59e0b15', color: '#f59e0b' },
  livree:    { label: 'Livree',    bg: '#22c55e15', color: '#22c55e' },
  annulee:   { label: 'Annulee',   bg: '#ef444415', color: '#ef4444' },
};

export default function LivraisonsPage() {
  const [livraisons, setLivraisons] = useState<Livraison[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ client: '', chantier: '', commande_ref: '', beton_type: 'B25', quantite_m3: '', chauffeur: '', camion: '', heure_depart: '', date: new Date().toISOString().split('T')[0], distance_km: '' });

  const filtered = livraisons.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.client.toLowerCase().includes(q) || l.bon_livraison.toLowerCase().includes(q) || l.chauffeur.toLowerCase().includes(q);
    const matchDate = !filterDate || l.date === filterDate;
    return matchSearch && matchDate;
  });

  const todayStats = {
    planifiees: livraisons.filter(l => l.date === filterDate && l.statut === 'planifiee').length,
    en_cours: livraisons.filter(l => l.date === filterDate && l.statut === 'en_cours').length,
    livrees: livraisons.filter(l => l.date === filterDate && l.statut === 'livree').length,
    m3_livres: livraisons.filter(l => l.date === filterDate && l.statut === 'livree').reduce((s, l) => s + l.quantite_m3, 0),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const bl = `BL-2026-0${90 + livraisons.length}`;
    setLivraisons(prev => [{
      id: Date.now().toString(),
      bon_livraison: bl,
      commande_ref: form.commande_ref || 'N/A',
      client: form.client,
      chantier: form.chantier,
      beton_type: form.beton_type,
      quantite_m3: Number(form.quantite_m3),
      chauffeur: form.chauffeur,
      camion: form.camion,
      heure_depart: form.heure_depart || undefined,
      date: form.date,
      statut: 'planifiee',
      distance_km: form.distance_km ? Number(form.distance_km) : undefined,
    }, ...prev]);
    setForm({ client: '', chantier: '', commande_ref: '', beton_type: 'B25', quantite_m3: '', chauffeur: '', camion: '', heure_depart: '', date: new Date().toISOString().split('T')[0], distance_km: '' });
    setShowForm(false);
    setSaving(false);
  }

  function advance(id: string) {
    const flow: StatutLivraison[] = ['planifiee', 'en_cours', 'livree'];
    setLivraisons(prev => prev.map(l => {
      if (l.id !== id) return l;
      const idx = flow.indexOf(l.statut);
      if (idx < 0 || idx >= flow.length - 1) return l;
      const next = flow[idx + 1];
      return {
        ...l,
        statut: next,
        heure_depart: next === 'en_cours' ? new Date().toTimeString().slice(0, 5) : l.heure_depart,
        heure_arrivee: next === 'livree' ? new Date().toTimeString().slice(0, 5) : l.heure_arrivee,
      };
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          <Truck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Livraisons</h1>
          <p className="text-sm text-muted-foreground">Suivi des bons de livraison et tournees</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Planifier livraison
        </button>
      </div>

      {/* Stats du jour */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Planifiees', value: todayStats.planifiees, color: SARPA_PURPLE },
          { label: 'En cours', value: todayStats.en_cours, color: SARPA_YELLOW },
          { label: 'Livrees', value: todayStats.livrees, color: '#22c55e' },
          { label: 'M3 livres', value: todayStats.m3_livres, color: '#0ea5e9' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-4'}>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Rechercher client, chauffeur, BL..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" className={inputCls + ' w-auto'} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
      </div>

      {/* Cards livraisons */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className={cardCls + ' py-12 text-center'}>
            <Truck size={32} className="mx-auto mb-3 opacity-20 text-foreground" />
            <p className="text-sm text-muted-foreground">Aucune livraison pour cette date</p>
          </div>
        ) : filtered.map(l => {
          const s = STATUT_CONFIG[l.statut];
          const flow: StatutLivraison[] = ['planifiee', 'en_cours', 'livree'];
          const idx = flow.indexOf(l.statut);
          const canAdvance = idx >= 0 && idx < flow.length - 1;
          return (
            <div key={l.id} className={cardCls + ' p-5'}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color + '15' }}>
                    <Truck size={18} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-foreground">{l.bon_livraison}</span>
                      <span className="text-xs text-muted-foreground">→ {l.commande_ref}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </div>
                    <p className="font-semibold text-foreground mt-1">{l.client}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin size={11} /> {l.chantier} {l.distance_km && `(${l.distance_km} km)`}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>🚛 {l.camion}</span>
                      <span>👤 {l.chauffeur}</span>
                      <span className="font-bold" style={{ color: SARPA_PURPLE }}>{l.beton_type} — {l.quantite_m3} M3</span>
                      {l.heure_depart && <span>⏱ Depart: {l.heure_depart}</span>}
                      {l.heure_arrivee && <span>✅ Arrivee: {l.heure_arrivee}</span>}
                    </div>
                  </div>
                </div>
                {canAdvance && (
                  <button onClick={() => advance(l.id)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors hover:opacity-80"
                    style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>
                    {l.statut === 'planifiee' ? '▶ Demarrer' : '✓ Livree'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
              <h3 className="font-bold text-foreground">Planifier une livraison</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Client</label>
                  <input type="text" className={inputCls} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} required />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Chantier / Adresse</label>
                  <input type="text" className={inputCls} value={form.chantier} onChange={e => setForm(p => ({ ...p, chantier: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Commande ref.</label>
                  <input type="text" className={inputCls} value={form.commande_ref} onChange={e => setForm(p => ({ ...p, commande_ref: e.target.value }))} placeholder="CMD-2026-..." />
                </div>
                <div>
                  <label className={labelCls}>Type beton</label>
                  <select className={selectCls} value={form.beton_type} onChange={e => setForm(p => ({ ...p, beton_type: e.target.value }))}>
                    {['B20', 'B25', 'B30', 'B35', 'B40'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Quantite (M3)</label>
                  <input type="number" min="1" className={inputCls} value={form.quantite_m3} onChange={e => setForm(p => ({ ...p, quantite_m3: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Distance (km)</label>
                  <input type="number" min="0" className={inputCls} value={form.distance_km} onChange={e => setForm(p => ({ ...p, distance_km: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Chauffeur</label>
                  <input type="text" className={inputCls} value={form.chauffeur} onChange={e => setForm(p => ({ ...p, chauffeur: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Camion (immatriculation)</label>
                  <input type="text" className={inputCls} value={form.camion} onChange={e => setForm(p => ({ ...p, camion: e.target.value }))} required placeholder="DK-5421-A" />
                </div>
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Heure depart</label>
                  <input type="time" className={inputCls} value={form.heure_depart} onChange={e => setForm(p => ({ ...p, heure_depart: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><CheckCircle2 size={14} /> Planifier</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
