'use client';
import { useState } from 'react';
import { ShoppingCart, Plus, X, Loader2, CheckCircle2, Clock, Truck, Search } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = 'hsl(var(--primary))';
const SARPA_YELLOW = 'hsl(var(--secondary))';

type StatutCommande = 'en_attente' | 'confirmee' | 'en_production' | 'livree' | 'annulee';

interface Commande {
  id: string;
  numero: string;
  client: string;
  telephone?: string;
  chantier: string;
  beton_type: string;
  quantite_m3: number;
  date_souhaitee: string;
  date_creation: string;
  statut: StatutCommande;
  notes?: string;
  prix_m3?: number;
}

const MOCK: Commande[] = [
  { id: '1', numero: 'CMD-2026-041', client: 'BTP Sénégal SA', telephone: '+221 33 821 00 00', chantier: 'Immeuble R+8 Plateau', beton_type: 'B30', quantite_m3: 120, date_souhaitee: '2026-03-28', date_creation: '2026-03-22', statut: 'confirmee', prix_m3: 85000 },
  { id: '2', numero: 'CMD-2026-042', client: 'Groupe Diallo Construction', telephone: '+221 77 500 12 34', chantier: 'Villa duplexe Almadies', beton_type: 'B25', quantite_m3: 35, date_souhaitee: '2026-03-27', date_creation: '2026-03-23', statut: 'en_production', prix_m3: 75000 },
  { id: '3', numero: 'CMD-2026-043', client: 'Etat du Sénégal — AGEROUTE', chantier: 'Route VDN extension', beton_type: 'B40', quantite_m3: 300, date_souhaitee: '2026-04-02', date_creation: '2026-03-24', statut: 'en_attente', prix_m3: 95000 },
  { id: '4', numero: 'CMD-2026-040', client: 'Immobilier Futur', telephone: '+221 76 300 45 67', chantier: 'Residence Grand Yoff', beton_type: 'B25', quantite_m3: 80, date_souhaitee: '2026-03-26', date_creation: '2026-03-20', statut: 'livree', prix_m3: 75000 },
  { id: '5', numero: 'CMD-2026-039', client: 'SOGIP SA', chantier: 'Fondations hangar Mbao', beton_type: 'B35', quantite_m3: 60, date_souhaitee: '2026-03-25', date_creation: '2026-03-19', statut: 'livree', prix_m3: 88000 },
];

const STATUT_CONFIG: Record<StatutCommande, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  en_attente:   { label: 'En attente',    bg: '#f59e0b15', color: '#f59e0b', icon: <Clock size={11} /> },
  confirmee:    { label: 'Confirmee',     bg: 'rgba(30,64,175,0.08)', color: 'hsl(var(--primary))', icon: <CheckCircle2 size={11} /> },
  en_production:{ label: 'En production', bg: '#0ea5e915', color: '#0ea5e9', icon: <ShoppingCart size={11} /> },
  livree:       { label: 'Livree',        bg: '#22c55e15', color: '#22c55e', icon: <CheckCircle2 size={11} /> },
  annulee:      { label: 'Annulee',       bg: '#ef444415', color: '#ef4444', icon: <X size={11} /> },
};

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<StatutCommande | 'tous'>('tous');
  const [form, setForm] = useState({ client: '', telephone: '', chantier: '', beton_type: 'B25', quantite_m3: '', date_souhaitee: '', prix_m3: '', notes: '' });

  const filtered = commandes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.client.toLowerCase().includes(q) || c.numero.toLowerCase().includes(q) || c.chantier.toLowerCase().includes(q);
    const matchStatut = filterStatut === 'tous' || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const stats = {
    total: commandes.filter(c => c.statut !== 'annulee').length,
    en_cours: commandes.filter(c => ['confirmee', 'en_production'].includes(c.statut)).length,
    ca_previsionnel: commandes.filter(c => c.statut !== 'annulee' && c.prix_m3).reduce((s, c) => s + (c.quantite_m3 * (c.prix_m3 || 0)), 0),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const num = `CMD-2026-0${commandes.length + 42}`;
    setCommandes(prev => [{
      id: Date.now().toString(),
      numero: num,
      client: form.client,
      telephone: form.telephone || undefined,
      chantier: form.chantier,
      beton_type: form.beton_type,
      quantite_m3: Number(form.quantite_m3),
      date_souhaitee: form.date_souhaitee,
      date_creation: new Date().toISOString().split('T')[0],
      statut: 'en_attente',
      prix_m3: form.prix_m3 ? Number(form.prix_m3) : undefined,
      notes: form.notes || undefined,
    }, ...prev]);
    setForm({ client: '', telephone: '', chantier: '', beton_type: 'B25', quantite_m3: '', date_souhaitee: '', prix_m3: '', notes: '' });
    setShowForm(false);
    setSaving(false);
  }

  function nextStatut(current: StatutCommande): StatutCommande | null {
    const flow: StatutCommande[] = ['en_attente', 'confirmee', 'en_production', 'livree'];
    const idx = flow.indexOf(current);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_YELLOW}, #f59e0b)` }}>
          <ShoppingCart size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Commandes</h1>
          <p className="text-sm text-muted-foreground">Gestion des commandes clients de beton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Nouvelle commande
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Commandes actives', value: stats.total, color: SARPA_PURPLE },
          { label: 'En cours', value: stats.en_cours, color: '#0ea5e9' },
          { label: 'CA previsionnel', value: new Intl.NumberFormat('fr-FR').format(stats.ca_previsionnel) + ' F', color: '#22c55e' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Rechercher client, chantier..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls + ' w-auto'} value={filterStatut} onChange={e => setFilterStatut(e.target.value as any)}>
          <option value="tous">Tous les statuts</option>
          {(Object.keys(STATUT_CONFIG) as StatutCommande[]).map(s => (
            <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={cardCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                {['N° Commande', 'Client', 'Chantier', 'Type', 'Qte (M3)', 'Date souhaitee', 'Prix unit.', 'Statut', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const s = STATUT_CONFIG[c.statut];
                const next = nextStatut(c.statut);
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">{c.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.client}</p>
                      {c.telephone && <p className="text-xs text-muted-foreground">{c.telephone}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.chantier}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: SARPA_PURPLE }}>{c.beton_type}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{c.quantite_m3}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.date_souhaitee}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.prix_m3 ? new Intl.NumberFormat('fr-FR').format(c.prix_m3) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>
                        {s.icon}{s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {next && (
                        <button onClick={() => setCommandes(prev => prev.map(x => x.id === c.id ? { ...x, statut: next } : x))}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors hover:opacity-80"
                          style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>
                          → {STATUT_CONFIG[next].label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <ShoppingCart size={32} className="mx-auto mb-3 opacity-20 text-foreground" />
              <p className="text-sm text-muted-foreground">Aucune commande trouvee</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
              <h3 className="font-bold text-foreground">Nouvelle commande</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Client</label>
                  <input type="text" className={inputCls} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} required placeholder="Nom entreprise ou client" />
                </div>
                <div>
                  <label className={labelCls}>Telephone</label>
                  <input type="tel" className={inputCls} value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+221 77..." />
                </div>
                <div>
                  <label className={labelCls}>Date souhaitee</label>
                  <input type="date" className={inputCls} value={form.date_souhaitee} onChange={e => setForm(p => ({ ...p, date_souhaitee: e.target.value }))} required />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Chantier / Destination</label>
                  <input type="text" className={inputCls} value={form.chantier} onChange={e => setForm(p => ({ ...p, chantier: e.target.value }))} required placeholder="Adresse du chantier" />
                </div>
                <div>
                  <label className={labelCls}>Type de beton</label>
                  <select className={selectCls} value={form.beton_type} onChange={e => setForm(p => ({ ...p, beton_type: e.target.value }))}>
                    {['B20', 'B25', 'B30', 'B35', 'B40'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Quantite (M3)</label>
                  <input type="number" min="1" className={inputCls} value={form.quantite_m3} onChange={e => setForm(p => ({ ...p, quantite_m3: e.target.value }))} required placeholder="ex: 50" />
                </div>
                <div>
                  <label className={labelCls}>Prix unitaire (F CFA/M3)</label>
                  <input type="number" min="0" className={inputCls} value={form.prix_m3} onChange={e => setForm(p => ({ ...p, prix_m3: e.target.value }))} placeholder="ex: 85000" />
                </div>
                <div>
                  <label className={labelCls}>&nbsp;</label>
                  {form.prix_m3 && form.quantite_m3 && (
                    <div className="px-3 py-2.5 rounded-xl text-sm font-bold" style={{ background: SARPA_PURPLE + '10', color: SARPA_PURPLE }}>
                      Total: {new Intl.NumberFormat('fr-FR').format(Number(form.prix_m3) * Number(form.quantite_m3))} F
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Instructions particulieres..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><CheckCircle2 size={14} /> Creer la commande</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
