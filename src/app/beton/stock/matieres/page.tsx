'use client';
import { useState } from 'react';
import { Package, Plus, X, AlertTriangle, CheckCircle2, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

type Unite = 'Tonne' | 'M3' | 'Sac' | 'Litre';
type MouvType = 'entree' | 'sortie';

interface Matiere {
  id: string;
  nom: string;
  unite: Unite;
  stock_actuel: number;
  stock_min: number;
  stock_max: number;
  fournisseur?: string;
  derniere_livraison?: string;
}

interface Mouvement {
  id: string;
  matiere_id: string;
  matiere_nom: string;
  type: MouvType;
  quantite: number;
  date: string;
  reference?: string;
}

const MATIERES: Matiere[] = [
  { id: '1', nom: 'Ciment CEM I 42.5', unite: 'Tonne', stock_actuel: 85, stock_min: 50, stock_max: 200, fournisseur: 'SOCOCIM', derniere_livraison: '2026-03-22' },
  { id: '2', nom: 'Sable fin',          unite: 'M3',    stock_actuel: 120, stock_min: 80, stock_max: 300, fournisseur: 'Carrieres du Sahel', derniere_livraison: '2026-03-20' },
  { id: '3', nom: 'Gravier 8/16',       unite: 'M3',    stock_actuel: 45, stock_min: 60, stock_max: 250, fournisseur: 'Carrieres du Sahel', derniere_livraison: '2026-03-18' },
  { id: '4', nom: 'Eau',               unite: 'M3',    stock_actuel: 200, stock_min: 100, stock_max: 500, fournisseur: 'SDE', derniere_livraison: '2026-03-26' },
  { id: '5', nom: 'Adjuvant plastifiant', unite: 'Litre', stock_actuel: 320, stock_min: 100, stock_max: 600, fournisseur: 'CHRYSO Sénégal', derniere_livraison: '2026-03-15' },
  { id: '6', nom: 'Fibres metalliques', unite: 'Tonne', stock_actuel: 2.5, stock_min: 5, stock_max: 20, fournisseur: 'Import Europe', derniere_livraison: '2026-02-28' },
];

const MOUVEMENTS: Mouvement[] = [
  { id: '1', matiere_id: '1', matiere_nom: 'Ciment CEM I 42.5', type: 'entree', quantite: 30, date: '2026-03-22', reference: 'BL-2026-089' },
  { id: '2', matiere_id: '1', matiere_nom: 'Ciment CEM I 42.5', type: 'sortie', quantite: 8.5, date: '2026-03-26', reference: 'PROD-026' },
  { id: '3', matiere_id: '3', matiere_nom: 'Gravier 8/16',       type: 'sortie', quantite: 15, date: '2026-03-26', reference: 'PROD-026' },
  { id: '4', matiere_id: '2', matiere_nom: 'Sable fin',           type: 'entree', quantite: 50, date: '2026-03-20', reference: 'BL-2026-085' },
];

export default function StockMatieresPage() {
  const [matieres, setMatieres] = useState<Matiere[]>(MATIERES);
  const [mouvements, setMouvements] = useState<Mouvement[]>(MOUVEMENTS);
  const [showForm, setShowForm] = useState(false);
  const [showMouvForm, setShowMouvForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'stock' | 'mouvements'>('stock');

  const [form, setForm] = useState({ nom: '', unite: 'Tonne' as Unite, stock_actuel: '', stock_min: '', stock_max: '', fournisseur: '' });
  const [mouvForm, setMouvForm] = useState({ matiere_id: '', type: 'entree' as MouvType, quantite: '', date: new Date().toISOString().split('T')[0], reference: '' });

  const alertes = matieres.filter(m => m.stock_actuel < m.stock_min);

  async function handleAddMatiere(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setMatieres(prev => [...prev, { id: Date.now().toString(), nom: form.nom, unite: form.unite, stock_actuel: Number(form.stock_actuel), stock_min: Number(form.stock_min), stock_max: Number(form.stock_max), fournisseur: form.fournisseur }]);
    setForm({ nom: '', unite: 'Tonne', stock_actuel: '', stock_min: '', stock_max: '', fournisseur: '' });
    setShowForm(false);
    setSaving(false);
  }

  async function handleMouvement(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const mat = matieres.find(m => m.id === mouvForm.matiere_id);
    if (!mat) { setSaving(false); return; }
    const qte = Number(mouvForm.quantite);
    setMatieres(prev => prev.map(m => m.id === mouvForm.matiere_id
      ? { ...m, stock_actuel: mouvForm.type === 'entree' ? m.stock_actuel + qte : Math.max(0, m.stock_actuel - qte) }
      : m));
    setMouvements(prev => [{ id: Date.now().toString(), matiere_id: mouvForm.matiere_id, matiere_nom: mat.nom, type: mouvForm.type, quantite: qte, date: mouvForm.date, reference: mouvForm.reference || undefined }, ...prev]);
    setMouvForm({ matiere_id: '', type: 'entree', quantite: '', date: new Date().toISOString().split('T')[0], reference: '' });
    setShowMouvForm(false);
    setSaving(false);
  }

  function stockLevel(m: Matiere): 'ok' | 'low' | 'critical' {
    const ratio = m.stock_actuel / m.stock_min;
    if (ratio < 1) return 'critical';
    if (ratio < 1.3) return 'low';
    return 'ok';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
          <Package size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Stock Matieres Premieres</h1>
          <p className="text-sm text-muted-foreground">Gestion des stocks et mouvements</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowMouvForm(true)} className={btnSecondary}>
            <TrendingUp size={14} /> Mouvement
          </button>
          <button onClick={() => setShowForm(true)} className={btnPrimary} style={{ background: SARPA_PURPLE }}>
            <Plus size={14} /> Ajouter matiere
          </button>
        </div>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{ background: '#ef444410', borderColor: '#ef444430' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Stock critique — {alertes.length} matiere(s)</p>
            <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>{alertes.map(a => a.nom).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-700 w-fit">
        {(['stock', 'mouvements'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize"
            style={tab === t ? { background: SARPA_PURPLE, color: '#fff' } : { color: 'var(--muted-foreground)' }}>
            {t === 'stock' ? 'Stock actuel' : 'Mouvements'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {matieres.map(m => {
            const level = stockLevel(m);
            const pct = Math.min(100, Math.round((m.stock_actuel / m.stock_max) * 100));
            const barColor = level === 'critical' ? '#ef4444' : level === 'low' ? SARPA_YELLOW : '#22c55e';
            return (
              <div key={m.id} className={cardCls + ' p-5'}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-foreground text-sm">{m.nom}</p>
                    {m.fournisseur && <p className="text-xs text-muted-foreground mt-0.5">{m.fournisseur}</p>}
                  </div>
                  {level === 'critical' && <AlertTriangle size={16} style={{ color: '#ef4444' }} />}
                  {level === 'ok' && <CheckCircle2 size={16} style={{ color: '#22c55e' }} />}
                </div>
                <p className="text-2xl font-black text-foreground">{m.stock_actuel} <span className="text-sm font-normal text-muted-foreground">{m.unite}</span></p>
                <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>Min: {m.stock_min}</span>
                  <span>Max: {m.stock_max}</span>
                </div>
                {m.derniere_livraison && <p className="text-xs text-muted-foreground mt-2">Derniere livraison: {m.derniere_livraison}</p>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'mouvements' && (
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                  {['Date', 'Matiere', 'Type', 'Quantite', 'Reference'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mouvements.map(mv => (
                  <tr key={mv.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-foreground">{mv.date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{mv.matiere_nom}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: mv.type === 'entree' ? '#22c55e' : '#ef4444' }}>
                        {mv.type === 'entree' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {mv.type === 'entree' ? 'Entree' : 'Sortie'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{mv.quantite}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mv.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: ajouter matiere */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Nouvelle matiere premiere</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddMatiere} className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Designation</label>
                <input type="text" className={inputCls} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required placeholder="ex: Ciment CEM II" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Unite</label>
                  <select className={selectCls} value={form.unite} onChange={e => setForm(p => ({ ...p, unite: e.target.value as Unite }))}>
                    {(['Tonne', 'M3', 'Sac', 'Litre'] as Unite[]).map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Stock actuel</label>
                  <input type="number" min="0" className={inputCls} value={form.stock_actuel} onChange={e => setForm(p => ({ ...p, stock_actuel: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Stock minimum</label>
                  <input type="number" min="0" className={inputCls} value={form.stock_min} onChange={e => setForm(p => ({ ...p, stock_min: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Stock maximum</label>
                  <input type="number" min="0" className={inputCls} value={form.stock_max} onChange={e => setForm(p => ({ ...p, stock_max: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Fournisseur</label>
                <input type="text" className={inputCls} value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))} placeholder="Nom du fournisseur" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><CheckCircle2 size={14} /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: mouvement */}
      {showMouvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMouvForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Enregistrer un mouvement</h3>
              <button onClick={() => setShowMouvForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleMouvement} className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Matiere</label>
                <select className={selectCls} value={mouvForm.matiere_id} onChange={e => setMouvForm(p => ({ ...p, matiere_id: e.target.value }))} required>
                  <option value="">Choisir...</option>
                  {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={selectCls} value={mouvForm.type} onChange={e => setMouvForm(p => ({ ...p, type: e.target.value as MouvType }))}>
                    <option value="entree">Entree</option>
                    <option value="sortie">Sortie</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Quantite</label>
                  <input type="number" min="0" step="0.01" className={inputCls} value={mouvForm.quantite} onChange={e => setMouvForm(p => ({ ...p, quantite: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls} value={mouvForm.date} onChange={e => setMouvForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Reference</label>
                  <input type="text" className={inputCls} value={mouvForm.reference} onChange={e => setMouvForm(p => ({ ...p, reference: e.target.value }))} placeholder="BL-2026-..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMouvForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><CheckCircle2 size={14} /> Valider</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
