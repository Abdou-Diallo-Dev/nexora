'use client';
import { useState } from 'react';
import { Banknote, Plus, X, Loader2, CheckCircle2, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = 'hsl(var(--primary))';
const SARPA_YELLOW = 'hsl(var(--secondary))';

type TypeTx = 'recette' | 'depense';
type CategorieTx =
  | 'vente_beton' | 'vente_produits' | 'autre_recette'
  | 'achat_matieres' | 'carburant' | 'maintenance' | 'salaires' | 'loyer' | 'autre_depense';

interface Transaction {
  id: string;
  date: string;
  type: TypeTx;
  categorie: CategorieTx;
  libelle: string;
  montant: number;
  reference?: string;
}

const CATS_RECETTES: { value: CategorieTx; label: string }[] = [
  { value: 'vente_beton', label: 'Vente béton' },
  { value: 'vente_produits', label: 'Vente produits finis' },
  { value: 'autre_recette', label: 'Autre recette' },
];
const CATS_DEPENSES: { value: CategorieTx; label: string }[] = [
  { value: 'achat_matieres', label: 'Achat matières premières' },
  { value: 'carburant', label: 'Carburant' },
  { value: 'maintenance', label: 'Maintenance / réparation' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'loyer', label: 'Loyer / charges fixes' },
  { value: 'autre_depense', label: 'Autre dépense' },
];
const ALL_CATS = [...CATS_RECETTES, ...CATS_DEPENSES];

const MOCK: Transaction[] = [
  { id: '1', date: '2026-03-26', type: 'recette',  categorie: 'vente_beton',    libelle: 'Facture FAC-2026-040 — Diallo Const.', montant: 3097500, reference: 'FAC-2026-040' },
  { id: '2', date: '2026-03-25', type: 'depense',  categorie: 'carburant',       libelle: 'Carburant toupies — 4 véhicules', montant: 450000 },
  { id: '3', date: '2026-03-24', type: 'depense',  categorie: 'achat_matieres',  libelle: 'Livraison ciment SOCOCIM — 30T', montant: 2250000, reference: 'BL-SOCOCIM-089' },
  { id: '4', date: '2026-03-22', type: 'recette',  categorie: 'vente_beton',    libelle: 'Acompte CMD-2026-043 AGEROUTE', montant: 10000000, reference: 'CMD-2026-043' },
  { id: '5', date: '2026-03-20', type: 'depense',  categorie: 'salaires',        libelle: 'Salaires équipe production — Mars 2026', montant: 3500000 },
  { id: '6', date: '2026-03-18', type: 'depense',  categorie: 'maintenance',     libelle: 'Réparation toupie DK-5424-A', montant: 680000, reference: 'MAINT-2026-012' },
  { id: '7', date: '2026-03-15', type: 'recette',  categorie: 'vente_produits',  libelle: 'Vente parpaings — Immobilier Futur', montant: 425000 },
  { id: '8', date: '2026-03-10', type: 'depense',  categorie: 'loyer',           libelle: 'Loyer site industriel — Mars 2026', montant: 1200000 },
];

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n); }

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TypeTx | 'tous'>('tous');
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'recette' as TypeTx, categorie: 'vente_beton' as CategorieTx, libelle: '', montant: '', reference: '' });

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.libelle.toLowerCase().includes(q) || (t.reference || '').toLowerCase().includes(q))
      && (filterType === 'tous' || t.type === filterType);
  });

  const totalRecettes = transactions.filter(t => t.type === 'recette').reduce((s, t) => s + t.montant, 0);
  const totalDepenses = transactions.filter(t => t.type === 'depense').reduce((s, t) => s + t.montant, 0);
  const solde = totalRecettes - totalDepenses;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setTransactions(prev => [{
      id: Date.now().toString(), date: form.date, type: form.type, categorie: form.categorie,
      libelle: form.libelle, montant: Number(form.montant), reference: form.reference || undefined,
    }, ...prev]);
    setForm({ date: new Date().toISOString().split('T')[0], type: 'recette', categorie: 'vente_beton', libelle: '', montant: '', reference: '' });
    setShowForm(false); setSaving(false);
  }

  // Group by categorie for pie-like summary
  const byCategorie = ALL_CATS.map(c => ({
    ...c,
    total: transactions.filter(t => t.categorie === c.value).reduce((s, t) => s + t.montant, 0),
    type: CATS_RECETTES.find(r => r.value === c.value) ? 'recette' : 'depense' as TypeTx,
  })).filter(c => c.total > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
          <Banknote size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Finance SARPA Béton</h1>
          <p className="text-sm text-muted-foreground">Recettes, dépenses et trésorerie</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Nouvelle transaction
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} style={{ color: '#22c55e' }} /><span className="text-xs text-muted-foreground">Recettes</span></div>
          <p className="text-2xl font-black" style={{ color: '#22c55e' }}>{fmt(totalRecettes)} F</p>
        </div>
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={16} style={{ color: '#ef4444' }} /><span className="text-xs text-muted-foreground">Dépenses</span></div>
          <p className="text-2xl font-black" style={{ color: '#ef4444' }}>{fmt(totalDepenses)} F</p>
        </div>
        <div className={cardCls + ' p-5'}>
          <div className="flex items-center gap-2 mb-2"><Banknote size={16} style={{ color: solde >= 0 ? SARPA_PURPLE : '#ef4444' }} /><span className="text-xs text-muted-foreground">Solde net</span></div>
          <p className="text-2xl font-black" style={{ color: solde >= 0 ? SARPA_PURPLE : '#ef4444' }}>{solde >= 0 ? '+' : ''}{fmt(solde)} F</p>
        </div>
      </div>

      {/* Répartition par catégorie */}
      <div className={cardCls + ' p-5'}>
        <h3 className="text-sm font-bold text-foreground mb-4">Répartition par catégorie</h3>
        <div className="space-y-2">
          {byCategorie.map(c => {
            const total = c.type === 'recette' ? totalRecettes : totalDepenses;
            const pct = total ? Math.round((c.total / total) * 100) : 0;
            const color = c.type === 'recette' ? '#22c55e' : '#ef4444';
            return (
              <div key={c.value}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-bold text-foreground">{fmt(c.total)} F <span className="font-normal text-muted-foreground">({pct}%)</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtres + Table */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls + ' w-auto'} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
          <option value="tous">Tous</option>
          <option value="recette">Recettes</option>
          <option value="depense">Dépenses</option>
        </select>
      </div>

      <div className={cardCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                {['Date', 'Libellé', 'Catégorie', 'Référence', 'Montant'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const cat = ALL_CATS.find(c => c.value === t.categorie);
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{t.libelle}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{cat?.label || t.categorie}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.reference || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold flex items-center gap-1" style={{ color: t.type === 'recette' ? '#22c55e' : '#ef4444' }}>
                        {t.type === 'recette' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {t.type === 'recette' ? '+' : '-'}{fmt(t.montant)} F
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Banknote size={32} className="mx-auto mb-3 opacity-20 text-foreground" />
              <p className="text-sm text-muted-foreground">Aucune transaction trouvée</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Nouvelle transaction</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required /></div>
                <div><label className={labelCls}>Type</label>
                  <select className={selectCls} value={form.type} onChange={e => {
                    const t = e.target.value as TypeTx;
                    setForm(p => ({ ...p, type: t, categorie: t === 'recette' ? 'vente_beton' : 'achat_matieres' }));
                  }}>
                    <option value="recette">Recette</option>
                    <option value="depense">Dépense</option>
                  </select>
                </div>
                <div className="col-span-2"><label className={labelCls}>Catégorie</label>
                  <select className={selectCls} value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value as CategorieTx }))}>
                    {(form.type === 'recette' ? CATS_RECETTES : CATS_DEPENSES).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className={labelCls}>Libellé</label><input className={inputCls} value={form.libelle} onChange={e => setForm(p => ({ ...p, libelle: e.target.value }))} required /></div>
                <div><label className={labelCls}>Montant (F CFA)</label><input type="number" min="0" className={inputCls} value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))} required /></div>
                <div><label className={labelCls}>Référence</label><input className={inputCls} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enreg...</> : <><CheckCircle2 size={14} /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
