'use client';
import { useState } from 'react';
import { Gauge, Plus, X, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

type BetonType = 'B25' | 'B30' | 'B35' | 'B40' | 'Autre';
type Shift = 'Matin' | 'Apres-midi' | 'Nuit';

interface ProductionEntry {
  id: string;
  date: string;
  shift: Shift;
  beton_type: BetonType;
  quantity_m3: number;
  operator: string;
  notes?: string;
  status: 'conforme' | 'non_conforme' | 'en_attente';
}

const MOCK: ProductionEntry[] = [
  { id: '1', date: '2026-03-26', shift: 'Matin', beton_type: 'B25', quantity_m3: 45, operator: 'Mamadou D.', status: 'conforme' },
  { id: '2', date: '2026-03-26', shift: 'Apres-midi', beton_type: 'B30', quantity_m3: 32, operator: 'Ibrahim S.', status: 'conforme' },
  { id: '3', date: '2026-03-25', shift: 'Matin', beton_type: 'B25', quantity_m3: 60, operator: 'Mamadou D.', status: 'conforme' },
  { id: '4', date: '2026-03-25', shift: 'Nuit', beton_type: 'B35', quantity_m3: 20, operator: 'Oumar B.', status: 'non_conforme', notes: 'Dosage ciment insuffisant' },
  { id: '5', date: '2026-03-24', shift: 'Matin', beton_type: 'B30', quantity_m3: 55, operator: 'Ibrahim S.', status: 'conforme' },
];

const BETON_TYPES: BetonType[] = ['B25', 'B30', 'B35', 'B40', 'Autre'];
const SHIFTS: Shift[] = ['Matin', 'Apres-midi', 'Nuit'];

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  conforme:     { label: 'Conforme',     bg: '#22c55e15', color: '#22c55e' },
  non_conforme: { label: 'Non conforme', bg: '#ef444415', color: '#ef4444' },
  en_attente:   { label: 'En attente',   bg: '#f59e0b15', color: '#f59e0b' },
};

export default function ProductionPage() {
  const [entries, setEntries] = useState<ProductionEntry[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: 'Matin' as Shift,
    beton_type: 'B25' as BetonType,
    quantity_m3: '',
    operator: '',
    notes: '',
  });

  const todayTotal = entries
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((s, e) => s + e.quantity_m3, 0);

  const monthTotal = entries.reduce((s, e) => s + e.quantity_m3, 0);
  const conformeCount = entries.filter(e => e.status === 'conforme').length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const newEntry: ProductionEntry = {
      id: Date.now().toString(),
      date: form.date,
      shift: form.shift,
      beton_type: form.beton_type,
      quantity_m3: Number(form.quantity_m3),
      operator: form.operator,
      notes: form.notes || undefined,
      status: 'en_attente',
    };
    setEntries(prev => [newEntry, ...prev]);
    setForm({ date: new Date().toISOString().split('T')[0], shift: 'Matin', beton_type: 'B25', quantity_m3: '', operator: '', notes: '' });
    setShowForm(false);
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_PURPLE}, #5b3ea8)` }}>
          <Gauge size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Production Beton</h1>
          <p className="text-sm text-muted-foreground">Suivi des gachees et quantites produites</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Nouvelle entree
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Production aujourd'hui", value: `${todayTotal} M3`, sub: 'Toutes gachees', color: SARPA_PURPLE },
          { label: 'Total ce mois', value: `${monthTotal} M3`, sub: 'Cumul mensuel', color: '#0ea5e9' },
          { label: 'Taux conformite', value: `${entries.length ? Math.round((conformeCount / entries.length) * 100) : 0}%`, sub: `${conformeCount}/${entries.length} batches`, color: '#22c55e' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{k.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={cardCls}>
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Historique de production</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                {['Date', 'Poste', 'Type', 'Quantite (M3)', 'Operateur', 'Statut', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const s = statusStyle[e.status];
                return (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-medium text-foreground">{e.date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.shift}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: SARPA_PURPLE }}>{e.beton_type}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{e.quantity_m3}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.operator}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Enregistrer une production</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Poste</label>
                  <select className={selectCls} value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value as Shift }))}>
                    {SHIFTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Type de beton</label>
                  <select className={selectCls} value={form.beton_type} onChange={e => setForm(p => ({ ...p, beton_type: e.target.value as BetonType }))}>
                    {BETON_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Quantite (M3)</label>
                  <input type="number" min="0" step="0.5" className={inputCls} value={form.quantity_m3} onChange={e => setForm(p => ({ ...p, quantity_m3: e.target.value }))} required placeholder="ex: 45" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Operateur</label>
                <input type="text" className={inputCls} value={form.operator} onChange={e => setForm(p => ({ ...p, operator: e.target.value }))} required placeholder="Nom de l'operateur" />
              </div>
              <div>
                <label className={labelCls}>Notes (optionnel)</label>
                <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observations, incidents..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><CheckCircle2 size={14} /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
