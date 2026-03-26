'use client';
import { useState } from 'react';
import { FlaskConical, Plus, X, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

type ResultatTest = 'conforme' | 'non_conforme' | 'en_attente';
type TypeTest = 'compression_7j' | 'compression_28j' | 'affaissement' | 'air_entraine' | 'chlorures';

interface TestQualite {
  id: string;
  date: string;
  beton_type: string;
  gachee_ref: string;
  type_test: TypeTest;
  valeur_mesuree: number;
  valeur_requise: number;
  unite: string;
  resultat: ResultatTest;
  technicien: string;
  notes?: string;
}

const TYPE_TEST_CONFIG: Record<TypeTest, { label: string; unite: string; description: string }> = {
  compression_7j:   { label: 'Compression 7j',   unite: 'MPa', description: 'Resistance a la compression a 7 jours' },
  compression_28j:  { label: 'Compression 28j',  unite: 'MPa', description: 'Resistance a la compression a 28 jours' },
  affaissement:     { label: 'Affaissement',      unite: 'mm',  description: 'Test au cone d\'Abrams (slump test)' },
  air_entraine:     { label: 'Air entraine',      unite: '%',   description: 'Teneur en air du beton frais' },
  chlorures:        { label: 'Teneur chlorures',  unite: '%',   description: 'Teneur en ions chlorures' },
};

const MOCK: TestQualite[] = [
  { id: '1', date: '2026-03-26', beton_type: 'B25', gachee_ref: 'G-2026-045', type_test: 'affaissement', valeur_mesuree: 85, valeur_requise: 100, unite: 'mm', resultat: 'conforme', technicien: 'Fatou Diop' },
  { id: '2', date: '2026-03-25', beton_type: 'B30', gachee_ref: 'G-2026-044', type_test: 'compression_7j', valeur_mesuree: 18.5, valeur_requise: 15, unite: 'MPa', resultat: 'conforme', technicien: 'Fatou Diop' },
  { id: '3', date: '2026-03-24', beton_type: 'B35', gachee_ref: 'G-2026-042', type_test: 'compression_7j', valeur_mesuree: 16.2, valeur_requise: 20, unite: 'MPa', resultat: 'non_conforme', technicien: 'Moussa Kamara', notes: 'Dosage ciment insuffisant — gachee rejetee' },
  { id: '4', date: '2026-03-22', beton_type: 'B25', gachee_ref: 'G-2026-038', type_test: 'compression_28j', valeur_mesuree: 28.7, valeur_requise: 25, unite: 'MPa', resultat: 'conforme', technicien: 'Fatou Diop' },
  { id: '5', date: '2026-03-20', beton_type: 'B30', gachee_ref: 'G-2026-035', type_test: 'compression_28j', valeur_mesuree: 32.1, valeur_requise: 30, unite: 'MPa', resultat: 'conforme', technicien: 'Moussa Kamara' },
  { id: '6', date: '2026-03-19', beton_type: 'B25', gachee_ref: 'G-2026-033', type_test: 'chlorures', valeur_mesuree: 0.08, valeur_requise: 0.10, unite: '%', resultat: 'conforme', technicien: 'Fatou Diop' },
  { id: '7', date: '2026-03-26', beton_type: 'B40', gachee_ref: 'G-2026-046', type_test: 'affaissement', valeur_mesuree: 0, valeur_requise: 80, unite: 'mm', resultat: 'en_attente', technicien: 'Moussa Kamara' },
];

const RESULTAT_CONFIG: Record<ResultatTest, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  conforme:     { label: 'Conforme',     bg: '#22c55e15', color: '#22c55e', icon: <CheckCircle2 size={12} /> },
  non_conforme: { label: 'Non conforme', bg: '#ef444415', color: '#ef4444', icon: <XCircle size={12} /> },
  en_attente:   { label: 'En attente',   bg: '#f59e0b15', color: '#f59e0b', icon: <AlertTriangle size={12} /> },
};

export default function QualitePage() {
  const [tests, setTests] = useState<TestQualite[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<TypeTest | 'tous'>('tous');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    beton_type: 'B25',
    gachee_ref: '',
    type_test: 'compression_7j' as TypeTest,
    valeur_mesuree: '',
    valeur_requise: '',
    technicien: '',
    notes: '',
  });

  const total = tests.length;
  const conformes = tests.filter(t => t.resultat === 'conforme').length;
  const nonConformes = tests.filter(t => t.resultat === 'non_conforme').length;
  const tauxConformite = total ? Math.round((conformes / total) * 100) : 0;

  const filtered = tests.filter(t => filterType === 'tous' || t.type_test === filterType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    const mesure = Number(form.valeur_mesuree);
    const requise = Number(form.valeur_requise);
    const unite = TYPE_TEST_CONFIG[form.type_test].unite;
    // Simple conformity: for compression tests, measured >= required; for others, measured <= required
    const isCompression = form.type_test.includes('compression');
    const conforme = isCompression ? mesure >= requise : mesure <= requise;
    setTests(prev => [{
      id: Date.now().toString(),
      date: form.date,
      beton_type: form.beton_type,
      gachee_ref: form.gachee_ref,
      type_test: form.type_test,
      valeur_mesuree: mesure,
      valeur_requise: requise,
      unite,
      resultat: conforme ? 'conforme' : 'non_conforme',
      technicien: form.technicien,
      notes: form.notes || undefined,
    }, ...prev]);
    setForm({ date: new Date().toISOString().split('T')[0], beton_type: 'B25', gachee_ref: '', type_test: 'compression_7j', valeur_mesuree: '', valeur_requise: '', technicien: '', notes: '' });
    setShowForm(false);
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
          <FlaskConical size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Controle Qualite</h1>
          <p className="text-sm text-muted-foreground">Tests et conformite des gachees de beton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Nouveau test
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Taux de conformite', value: `${tauxConformite}%`, color: tauxConformite >= 95 ? '#22c55e' : tauxConformite >= 80 ? SARPA_YELLOW : '#ef4444' },
          { label: 'Tests conformes', value: conformes, color: '#22c55e' },
          { label: 'Non conformes', value: nonConformes, color: '#ef4444' },
          { label: 'En attente', value: tests.filter(t => t.resultat === 'en_attente').length, color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Alertes non-conformite */}
      {nonConformes > 0 && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{ background: '#ef444410', borderColor: '#ef444430' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{nonConformes} test(s) non conforme(s)</p>
            <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>
              {tests.filter(t => t.resultat === 'non_conforme').map(t => `${t.gachee_ref} (${TYPE_TEST_CONFIG[t.type_test].label})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Filtre par type */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('tous')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={filterType === 'tous' ? { background: SARPA_PURPLE, color: '#fff' } : { background: 'var(--border)', color: 'var(--muted-foreground)' }}>
          Tous
        </button>
        {(Object.keys(TYPE_TEST_CONFIG) as TypeTest[]).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={filterType === t ? { background: SARPA_PURPLE, color: '#fff' } : { background: 'var(--border)', color: 'var(--muted-foreground)' }}>
            {TYPE_TEST_CONFIG[t].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={cardCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                {['Date', 'Gachee', 'Type beton', 'Test', 'Mesure', 'Requis', 'Resultat', 'Technicien', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const r = RESULTAT_CONFIG[t.resultat];
                const conf = TYPE_TEST_CONFIG[t.type_test];
                const isGood = t.type_test.includes('compression')
                  ? t.valeur_mesuree >= t.valeur_requise
                  : t.valeur_mesuree <= t.valeur_requise;
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">{t.gachee_ref}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: SARPA_PURPLE }}>{t.beton_type}</td>
                    <td className="px-4 py-3 text-foreground">{conf.label}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: t.resultat === 'en_attente' ? 'var(--muted-foreground)' : isGood ? '#22c55e' : '#ef4444' }}>
                      {t.resultat === 'en_attente' ? '—' : `${t.valeur_mesuree} ${t.unite}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.valeur_requise} {t.unite}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: r.bg, color: r.color }}>
                        {r.icon}{r.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.technicien}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{t.notes || '—'}</td>
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
              <h3 className="font-bold text-foreground">Enregistrer un test qualite</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Ref. gachee</label>
                  <input type="text" className={inputCls} value={form.gachee_ref} onChange={e => setForm(p => ({ ...p, gachee_ref: e.target.value }))} required placeholder="G-2026-..." />
                </div>
                <div>
                  <label className={labelCls}>Type beton</label>
                  <select className={selectCls} value={form.beton_type} onChange={e => setForm(p => ({ ...p, beton_type: e.target.value }))}>
                    {['B20', 'B25', 'B30', 'B35', 'B40'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Type de test</label>
                  <select className={selectCls} value={form.type_test} onChange={e => setForm(p => ({ ...p, type_test: e.target.value as TypeTest }))}>
                    {(Object.keys(TYPE_TEST_CONFIG) as TypeTest[]).map(t => (
                      <option key={t} value={t}>{TYPE_TEST_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Valeur mesuree ({TYPE_TEST_CONFIG[form.type_test].unite})</label>
                  <input type="number" step="0.01" className={inputCls} value={form.valeur_mesuree} onChange={e => setForm(p => ({ ...p, valeur_mesuree: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelCls}>Valeur requise ({TYPE_TEST_CONFIG[form.type_test].unite})</label>
                  <input type="number" step="0.01" className={inputCls} value={form.valeur_requise} onChange={e => setForm(p => ({ ...p, valeur_requise: e.target.value }))} required />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Technicien</label>
                  <input type="text" className={inputCls} value={form.technicien} onChange={e => setForm(p => ({ ...p, technicien: e.target.value }))} required placeholder="Nom du technicien" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea className={inputCls} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observations..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
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
