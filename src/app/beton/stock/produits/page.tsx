'use client';
import { useState } from 'react';
import { Boxes, Plus, X, Loader2, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';

type Unite = 'M3' | 'Tonne' | 'Palette' | 'Unité';
type MouvType = 'entree' | 'sortie';

interface ProduitFini {
  id: string;
  designation: string;
  reference: string;
  unite: Unite;
  stock_actuel: number;
  stock_min: number;
  prix_unitaire?: number;
  emplacement?: string;
  derniere_entree?: string;
}

interface Mouvement {
  id: string;
  produit_id: string;
  produit_nom: string;
  type: MouvType;
  quantite: number;
  date: string;
  reference?: string;
  client?: string;
}

const PRODUITS: ProduitFini[] = [
  { id: '1', designation: 'Béton prêt B25', reference: 'BET-B25', unite: 'M3', stock_actuel: 0, stock_min: 0, prix_unitaire: 75000, emplacement: 'Centrale' },
  { id: '2', designation: 'Béton prêt B30', reference: 'BET-B30', unite: 'M3', stock_actuel: 0, stock_min: 0, prix_unitaire: 85000, emplacement: 'Centrale' },
  { id: '3', designation: 'Parpaings 20cm', reference: 'PAR-20', unite: 'Palette', stock_actuel: 45, stock_min: 20, prix_unitaire: 85000, emplacement: 'Zone A', derniere_entree: '2026-03-24' },
  { id: '4', designation: 'Parpaings 15cm', reference: 'PAR-15', unite: 'Palette', stock_actuel: 12, stock_min: 15, prix_unitaire: 72000, emplacement: 'Zone A', derniere_entree: '2026-03-20' },
  { id: '5', designation: 'Hourdis 16cm', reference: 'HRD-16', unite: 'Palette', stock_actuel: 30, stock_min: 10, prix_unitaire: 95000, emplacement: 'Zone B', derniere_entree: '2026-03-22' },
  { id: '6', designation: 'Buses béton Ø400', reference: 'BUS-400', unite: 'Unité', stock_actuel: 18, stock_min: 5, prix_unitaire: 45000, emplacement: 'Zone C', derniere_entree: '2026-03-18' },
  { id: '7', designation: 'Buses béton Ø600', reference: 'BUS-600', unite: 'Unité', stock_actuel: 8, stock_min: 5, prix_unitaire: 78000, emplacement: 'Zone C', derniere_entree: '2026-03-15' },
];

const MOUVEMENTS: Mouvement[] = [
  { id: '1', produit_id: '3', produit_nom: 'Parpaings 20cm', type: 'sortie', quantite: 5, date: '2026-03-26', reference: 'BL-2026-089', client: 'Diallo Construction' },
  { id: '2', produit_id: '3', produit_nom: 'Parpaings 20cm', type: 'entree', quantite: 20, date: '2026-03-24', reference: 'PROD-024' },
  { id: '3', produit_id: '5', produit_nom: 'Hourdis 16cm', type: 'sortie', quantite: 3, date: '2026-03-23', reference: 'BL-2026-085', client: 'BTP Sénégal' },
  { id: '4', produit_id: '4', produit_nom: 'Parpaings 15cm', type: 'entree', quantite: 8, date: '2026-03-20', reference: 'PROD-020' },
];

export default function StockProduitsPage() {
  const [produits, setProduits] = useState<ProduitFini[]>(PRODUITS);
  const [mouvements, setMouvements] = useState<Mouvement[]>(MOUVEMENTS);
  const [tab, setTab] = useState<'stock' | 'mouvements'>('stock');
  const [showForm, setShowForm] = useState(false);
  const [showMouvForm, setShowMouvForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ designation: '', reference: '', unite: 'M3' as Unite, stock_actuel: '', stock_min: '', prix_unitaire: '', emplacement: '' });
  const [mouvForm, setMouvForm] = useState({ produit_id: '', type: 'entree' as MouvType, quantite: '', date: new Date().toISOString().split('T')[0], reference: '', client: '' });

  const alertes = produits.filter(p => p.stock_actuel < p.stock_min && p.stock_min > 0);
  const valeurStock = produits.reduce((s, p) => s + (p.stock_actuel * (p.prix_unitaire || 0)), 0);

  async function handleAddProduit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setProduits(prev => [...prev, {
      id: Date.now().toString(), designation: form.designation, reference: form.reference,
      unite: form.unite, stock_actuel: Number(form.stock_actuel), stock_min: Number(form.stock_min),
      prix_unitaire: form.prix_unitaire ? Number(form.prix_unitaire) : undefined, emplacement: form.emplacement || undefined,
    }]);
    setForm({ designation: '', reference: '', unite: 'M3', stock_actuel: '', stock_min: '', prix_unitaire: '', emplacement: '' });
    setShowForm(false); setSaving(false);
  }

  async function handleMouvement(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const prod = produits.find(p => p.id === mouvForm.produit_id);
    if (!prod) { setSaving(false); return; }
    const qte = Number(mouvForm.quantite);
    setProduits(prev => prev.map(p => p.id === mouvForm.produit_id
      ? { ...p, stock_actuel: mouvForm.type === 'entree' ? p.stock_actuel + qte : Math.max(0, p.stock_actuel - qte) }
      : p));
    setMouvements(prev => [{ id: Date.now().toString(), produit_id: mouvForm.produit_id, produit_nom: prod.designation, type: mouvForm.type, quantite: qte, date: mouvForm.date, reference: mouvForm.reference || undefined, client: mouvForm.client || undefined }, ...prev]);
    setMouvForm({ produit_id: '', type: 'entree', quantite: '', date: new Date().toISOString().split('T')[0], reference: '', client: '' });
    setShowMouvForm(false); setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <Boxes size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Stock Produits Finis</h1>
          <p className="text-sm text-muted-foreground">Parpaings, hourdis, buses et béton préparé</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowMouvForm(true)} className={btnSecondary}><TrendingUp size={14} /> Mouvement</button>
          <button onClick={() => setShowForm(true)} className={btnPrimary} style={{ background: SARPA_PURPLE }}><Plus size={14} /> Ajouter produit</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Références actives', value: produits.length, sub: 'produits catalogués' },
          { label: 'Alertes stock', value: alertes.length, sub: alertes.length ? alertes.map(a => a.designation).join(', ') : 'Aucune alerte' },
          { label: 'Valeur stock estimée', value: new Intl.NumberFormat('fr-FR').format(valeurStock) + ' F', sub: 'prix catalogue' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{k.label}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      {alertes.length > 0 && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{ background: '#ef444410', borderColor: '#ef444430' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Stock insuffisant — {alertes.length} produit(s)</p>
            <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>{alertes.map(a => a.designation).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-700 w-fit">
        {(['stock', 'mouvements'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={tab === t ? { background: SARPA_PURPLE, color: '#fff' } : { color: 'var(--muted-foreground)' }}>
            {t === 'stock' ? 'Stock actuel' : 'Mouvements'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                  {['Référence', 'Désignation', 'Unité', 'Stock', 'Min', 'Prix unit.', 'Emplacement', 'Statut'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produits.map(p => {
                  const isLow = p.stock_min > 0 && p.stock_actuel < p.stock_min;
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">{p.reference}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.designation}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.unite}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{p.stock_actuel}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.stock_min}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.prix_unitaire ? new Intl.NumberFormat('fr-FR').format(p.prix_unitaire) + ' F' : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.emplacement || '—'}</td>
                      <td className="px-4 py-3">
                        {p.stock_min === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#ef444415', color: '#ef4444' }}><AlertTriangle size={10} /> Insuffisant</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#22c55e15', color: '#22c55e' }}><CheckCircle2 size={10} /> OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'mouvements' && (
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                  {['Date', 'Produit', 'Type', 'Quantité', 'Référence', 'Client'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mouvements.map(mv => (
                  <tr key={mv.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-foreground">{mv.date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{mv.produit_nom}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: mv.type === 'entree' ? '#22c55e' : '#ef4444' }}>
                        {mv.type === 'entree' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {mv.type === 'entree' ? 'Entrée' : 'Sortie'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{mv.quantite}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mv.reference || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mv.client || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: ajouter produit */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Nouveau produit fini</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddProduit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Désignation</label><input className={inputCls} value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} required /></div>
                <div><label className={labelCls}>Référence</label><input className={inputCls} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} required placeholder="PAR-20" /></div>
                <div><label className={labelCls}>Unité</label>
                  <select className={selectCls} value={form.unite} onChange={e => setForm(p => ({ ...p, unite: e.target.value as Unite }))}>
                    {(['M3', 'Tonne', 'Palette', 'Unité'] as Unite[]).map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Stock actuel</label><input type="number" min="0" className={inputCls} value={form.stock_actuel} onChange={e => setForm(p => ({ ...p, stock_actuel: e.target.value }))} required /></div>
                <div><label className={labelCls}>Stock minimum</label><input type="number" min="0" className={inputCls} value={form.stock_min} onChange={e => setForm(p => ({ ...p, stock_min: e.target.value }))} required /></div>
                <div><label className={labelCls}>Prix unitaire (F)</label><input type="number" min="0" className={inputCls} value={form.prix_unitaire} onChange={e => setForm(p => ({ ...p, prix_unitaire: e.target.value }))} /></div>
                <div className="col-span-2"><label className={labelCls}>Emplacement</label><input className={inputCls} value={form.emplacement} onChange={e => setForm(p => ({ ...p, emplacement: e.target.value }))} placeholder="Zone A, Centrale..." /></div>
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

      {/* Modal: mouvement */}
      {showMouvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMouvForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Mouvement de stock</h3>
              <button onClick={() => setShowMouvForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleMouvement} className="p-5 space-y-4">
              <div><label className={labelCls}>Produit</label>
                <select className={selectCls} value={mouvForm.produit_id} onChange={e => setMouvForm(p => ({ ...p, produit_id: e.target.value }))} required>
                  <option value="">Choisir...</option>
                  {produits.map(p => <option key={p.id} value={p.id}>{p.designation}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Type</label>
                  <select className={selectCls} value={mouvForm.type} onChange={e => setMouvForm(p => ({ ...p, type: e.target.value as MouvType }))}>
                    <option value="entree">Entrée</option>
                    <option value="sortie">Sortie</option>
                  </select>
                </div>
                <div><label className={labelCls}>Quantité</label><input type="number" min="1" className={inputCls} value={mouvForm.quantite} onChange={e => setMouvForm(p => ({ ...p, quantite: e.target.value }))} required /></div>
                <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={mouvForm.date} onChange={e => setMouvForm(p => ({ ...p, date: e.target.value }))} required /></div>
                <div><label className={labelCls}>Référence</label><input className={inputCls} value={mouvForm.reference} onChange={e => setMouvForm(p => ({ ...p, reference: e.target.value }))} placeholder="BL ou PROD-..." /></div>
                <div className="col-span-2"><label className={labelCls}>Client (si sortie)</label><input className={inputCls} value={mouvForm.client} onChange={e => setMouvForm(p => ({ ...p, client: e.target.value }))} placeholder="Nom du client" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMouvForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enreg...</> : <><CheckCircle2 size={14} /> Valider</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
