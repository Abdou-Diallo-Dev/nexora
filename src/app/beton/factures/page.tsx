'use client';
import { useState } from 'react';
import { FileText, Plus, X, Loader2, CheckCircle2, Clock, AlertTriangle, Search, Download } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = 'hsl(var(--primary))';
const SARPA_YELLOW = 'hsl(var(--secondary))';

type StatutFacture = 'brouillon' | 'envoyee' | 'payee' | 'en_retard' | 'annulee';

interface Facture {
  id: string;
  numero: string;
  client: string;
  commande_ref?: string;
  montant_ht: number;
  tva_pct: number;
  montant_ttc: number;
  date_emission: string;
  date_echeance: string;
  date_paiement?: string;
  statut: StatutFacture;
  description: string;
}

const MOCK: Facture[] = [
  { id: '1', numero: 'FAC-2026-041', client: 'BTP Sénégal SA', commande_ref: 'CMD-2026-041', montant_ht: 8500000, tva_pct: 18, montant_ttc: 10030000, date_emission: '2026-03-22', date_echeance: '2026-04-22', statut: 'envoyee', description: '120 M3 béton B30 — Immeuble Plateau' },
  { id: '2', numero: 'FAC-2026-040', client: 'Groupe Diallo Construction', commande_ref: 'CMD-2026-042', montant_ht: 2625000, tva_pct: 18, montant_ttc: 3097500, date_emission: '2026-03-23', date_echeance: '2026-04-23', statut: 'envoyee', description: '35 M3 béton B25 — Villa Almadies' },
  { id: '3', numero: 'FAC-2026-039', client: 'Immobilier Futur', commande_ref: 'CMD-2026-040', montant_ht: 6000000, tva_pct: 18, montant_ttc: 7080000, date_emission: '2026-03-18', date_echeance: '2026-04-18', date_paiement: '2026-03-25', statut: 'payee', description: '80 M3 béton B25 — Résidence Grand Yoff' },
  { id: '4', numero: 'FAC-2026-035', client: 'SOGIP SA', montant_ht: 5280000, tva_pct: 18, montant_ttc: 6230400, date_emission: '2026-02-20', date_echeance: '2026-03-20', statut: 'en_retard', description: '60 M3 béton B35 — Hangar Mbao' },
  { id: '5', numero: 'FAC-2026-020', client: 'AGEROUTE', commande_ref: 'CMD-2026-020', montant_ht: 19950000, tva_pct: 18, montant_ttc: 23541000, date_emission: '2026-01-15', date_echeance: '2026-03-15', date_paiement: '2026-03-10', statut: 'payee', description: '210 M3 béton B40 — Route VDN extension' },
];

const STATUT_CONFIG: Record<StatutFacture, { label: string; bg: string; color: string }> = {
  brouillon:  { label: 'Brouillon',   bg: '#94a3b815', color: '#64748b' },
  envoyee:    { label: 'Envoyée',     bg: SARPA_PURPLE + '15', color: SARPA_PURPLE },
  payee:      { label: 'Payée',       bg: '#22c55e15', color: '#22c55e' },
  en_retard:  { label: 'En retard',   bg: '#ef444415', color: '#ef4444' },
  annulee:    { label: 'Annulée',     bg: '#94a3b815', color: '#94a3b8' },
};

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<StatutFacture | 'tous'>('tous');
  const [form, setForm] = useState({ client: '', commande_ref: '', montant_ht: '', tva_pct: '18', date_emission: new Date().toISOString().split('T')[0], date_echeance: '', description: '' });

  const filtered = factures.filter(f => {
    const q = search.toLowerCase();
    return (!q || f.client.toLowerCase().includes(q) || f.numero.toLowerCase().includes(q))
      && (filterStatut === 'tous' || f.statut === filterStatut);
  });

  const totalTTC = factures.filter(f => f.statut !== 'annulee').reduce((s, f) => s + f.montant_ttc, 0);
  const totalPaye = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant_ttc, 0);
  const totalEnRetard = factures.filter(f => f.statut === 'en_retard').reduce((s, f) => s + f.montant_ttc, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const ht = Number(form.montant_ht);
    const tva = Number(form.tva_pct);
    const ttc = Math.round(ht * (1 + tva / 100));
    const num = `FAC-2026-0${42 + factures.length}`;
    setFactures(prev => [{
      id: Date.now().toString(), numero: num, client: form.client,
      commande_ref: form.commande_ref || undefined, montant_ht: ht,
      tva_pct: tva, montant_ttc: ttc, date_emission: form.date_emission,
      date_echeance: form.date_echeance, statut: 'brouillon', description: form.description,
    }, ...prev]);
    setForm({ client: '', commande_ref: '', montant_ht: '', tva_pct: '18', date_emission: new Date().toISOString().split('T')[0], date_echeance: '', description: '' });
    setShowForm(false); setSaving(false);
  }

  function changeStatut(id: string, statut: StatutFacture) {
    setFactures(prev => prev.map(f => f.id === id
      ? { ...f, statut, date_paiement: statut === 'payee' ? new Date().toISOString().split('T')[0] : f.date_paiement }
      : f));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Facturation</h1>
          <p className="text-sm text-muted-foreground">Factures clients SARPA Béton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Nouvelle facture
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total facturé TTC', value: fmt(totalTTC) + ' F', sub: 'hors annulées', color: SARPA_PURPLE },
          { label: 'Encaissé', value: fmt(totalPaye) + ' F', sub: `${factures.filter(f => f.statut === 'payee').length} factures payées`, color: '#22c55e' },
          { label: 'En retard', value: fmt(totalEnRetard) + ' F', sub: `${factures.filter(f => f.statut === 'en_retard').length} facture(s) impayée(s)`, color: '#ef4444' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{k.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {factures.filter(f => f.statut === 'en_retard').length > 0 && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{ background: '#ef444410', borderColor: '#ef444430' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
            {factures.filter(f => f.statut === 'en_retard').length} facture(s) en retard de paiement — {fmt(totalEnRetard)} F TTC à recouvrir
          </p>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Rechercher client, numéro..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls + ' w-auto'} value={filterStatut} onChange={e => setFilterStatut(e.target.value as any)}>
          <option value="tous">Tous les statuts</option>
          {(Object.keys(STATUT_CONFIG) as StatutFacture[]).map(s => <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>)}
        </select>
      </div>

      <div className={cardCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                {['N° Facture', 'Client', 'Description', 'HT', 'TTC', 'Émission', 'Échéance', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const s = STATUT_CONFIG[f.statut];
                return (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">{f.numero}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{f.client}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{f.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(f.montant_ht)}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{fmt(f.montant_ttc)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.date_emission}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.date_echeance}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {f.statut === 'brouillon' && (
                          <button onClick={() => changeStatut(f.id, 'envoyee')} className="text-xs px-2 py-1 rounded-lg font-semibold hover:opacity-80" style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>Envoyer</button>
                        )}
                        {f.statut === 'envoyee' && (
                          <button onClick={() => changeStatut(f.id, 'payee')} className="text-xs px-2 py-1 rounded-lg font-semibold hover:opacity-80" style={{ background: '#22c55e15', color: '#22c55e' }}>Marquer payée</button>
                        )}
                        {f.statut === 'en_retard' && (
                          <button onClick={() => changeStatut(f.id, 'payee')} className="text-xs px-2 py-1 rounded-lg font-semibold hover:opacity-80" style={{ background: '#22c55e15', color: '#22c55e' }}>Encaisser</button>
                        )}
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700" title="Télécharger">
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <FileText size={32} className="mx-auto mb-3 opacity-20 text-foreground" />
              <p className="text-sm text-muted-foreground">Aucune facture trouvée</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Nouvelle facture</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div><label className={labelCls}>Client</label><input className={inputCls} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} required /></div>
              <div><label className={labelCls}>Description</label><input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required placeholder="ex: 50 M3 béton B30 — Chantier X" /></div>
              <div><label className={labelCls}>Réf. commande</label><input className={inputCls} value={form.commande_ref} onChange={e => setForm(p => ({ ...p, commande_ref: e.target.value }))} placeholder="CMD-2026-..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Montant HT (F)</label><input type="number" min="0" className={inputCls} value={form.montant_ht} onChange={e => setForm(p => ({ ...p, montant_ht: e.target.value }))} required /></div>
                <div><label className={labelCls}>TVA (%)</label>
                  <select className={selectCls} value={form.tva_pct} onChange={e => setForm(p => ({ ...p, tva_pct: e.target.value }))}>
                    {['0', '10', '18', '20'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {form.montant_ht && (
                  <div className="col-span-2 px-3 py-2 rounded-xl text-sm font-bold" style={{ background: SARPA_PURPLE + '10', color: SARPA_PURPLE }}>
                    TTC: {fmt(Math.round(Number(form.montant_ht) * (1 + Number(form.tva_pct) / 100)))} F
                  </div>
                )}
                <div><label className={labelCls}>Date émission</label><input type="date" className={inputCls} value={form.date_emission} onChange={e => setForm(p => ({ ...p, date_emission: e.target.value }))} required /></div>
                <div><label className={labelCls}>Date échéance</label><input type="date" className={inputCls} value={form.date_echeance} onChange={e => setForm(p => ({ ...p, date_echeance: e.target.value }))} required /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enreg...</> : <><CheckCircle2 size={14} /> Créer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
