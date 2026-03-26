'use client';
import { useState } from 'react';
import { CalendarDays, Plus, X, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

type Shift = 'Matin' | 'Après-midi' | 'Nuit';
type StatutPlanning = 'planifie' | 'en_cours' | 'termine' | 'annule';

interface PlanningEntry {
  id: string;
  date: string;
  shift: Shift;
  beton_type: string;
  quantite_prevue_m3: number;
  quantite_realisee_m3?: number;
  commande_ref?: string;
  client?: string;
  operateur: string;
  statut: StatutPlanning;
}

const MOCK: PlanningEntry[] = [
  { id: '1', date: '2026-03-27', shift: 'Matin', beton_type: 'B30', quantite_prevue_m3: 45, commande_ref: 'CMD-2026-041', client: 'BTP Sénégal SA', operateur: 'Mamadou D.', statut: 'planifie' },
  { id: '2', date: '2026-03-27', shift: 'Après-midi', beton_type: 'B25', quantite_prevue_m3: 30, commande_ref: 'CMD-2026-042', client: 'Diallo Construction', operateur: 'Ibrahim S.', statut: 'planifie' },
  { id: '3', date: '2026-03-26', shift: 'Matin', beton_type: 'B25', quantite_prevue_m3: 45, quantite_realisee_m3: 47, commande_ref: 'CMD-2026-042', client: 'Diallo Construction', operateur: 'Mamadou D.', statut: 'termine' },
  { id: '4', date: '2026-03-26', shift: 'Après-midi', beton_type: 'B30', quantite_prevue_m3: 32, quantite_realisee_m3: 32, operateur: 'Ibrahim S.', statut: 'termine' },
  { id: '5', date: '2026-03-26', shift: 'Nuit', beton_type: 'B40', quantite_prevue_m3: 20, operateur: 'Oumar B.', statut: 'annule' },
  { id: '6', date: '2026-03-28', shift: 'Matin', beton_type: 'B30', quantite_prevue_m3: 60, commande_ref: 'CMD-2026-041', client: 'BTP Sénégal SA', operateur: 'Mamadou D.', statut: 'planifie' },
  { id: '7', date: '2026-03-28', shift: 'Après-midi', beton_type: 'B35', quantite_prevue_m3: 25, operateur: 'Ibrahim S.', statut: 'planifie' },
];

const SHIFT_COLOR: Record<Shift, { bg: string; color: string }> = {
  'Matin':       { bg: '#fef9c3', color: '#854d0e' },
  'Après-midi':  { bg: '#dbeafe', color: '#1e40af' },
  'Nuit':        { bg: '#f1f5f9', color: '#475569' },
};

const STATUT_CONFIG: Record<StatutPlanning, { label: string; bg: string; color: string }> = {
  planifie: { label: 'Planifié',   bg: SARPA_PURPLE + '15', color: SARPA_PURPLE },
  en_cours: { label: 'En cours',   bg: '#f59e0b15', color: '#f59e0b' },
  termine:  { label: 'Terminé',    bg: '#22c55e15', color: '#22c55e' },
  annule:   { label: 'Annulé',     bg: '#ef444415', color: '#ef4444' },
};

function getWeekDates(offsetWeeks = 0): string[] {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

const JOURS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const SHIFTS: Shift[] = ['Matin', 'Après-midi', 'Nuit'];

export default function PlanningPage() {
  const [entries, setEntries] = useState<PlanningEntry[]>(MOCK);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'semaine' | 'liste'>('semaine');
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], shift: 'Matin' as Shift, beton_type: 'B25', quantite_prevue_m3: '', commande_ref: '', client: '', operateur: '' });

  const weekDates = getWeekDates(weekOffset);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setEntries(prev => [...prev, {
      id: Date.now().toString(), date: form.date, shift: form.shift, beton_type: form.beton_type,
      quantite_prevue_m3: Number(form.quantite_prevue_m3), commande_ref: form.commande_ref || undefined,
      client: form.client || undefined, operateur: form.operateur, statut: 'planifie',
    }]);
    setForm({ date: new Date().toISOString().split('T')[0], shift: 'Matin', beton_type: 'B25', quantite_prevue_m3: '', commande_ref: '', client: '', operateur: '' });
    setShowForm(false); setSaving(false);
  }

  function advanceStatut(id: string) {
    const flow: StatutPlanning[] = ['planifie', 'en_cours', 'termine'];
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const idx = flow.indexOf(e.statut);
      if (idx < 0 || idx >= flow.length - 1) return e;
      return { ...e, statut: flow[idx + 1] };
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_PURPLE}, #5b3ea8)` }}>
          <CalendarDays size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Planning Production</h1>
          <p className="text-sm text-muted-foreground">Programmation hebdomadaire des gâchées</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-700">
            {(['semaine', 'liste'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                style={view === v ? { background: SARPA_PURPLE, color: '#fff' } : { color: 'var(--muted-foreground)' }}>{v}</button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className={btnPrimary} style={{ background: SARPA_PURPLE }}>
            <Plus size={16} /> Planifier
          </button>
        </div>
      </div>

      {view === 'semaine' && (
        <div className={cardCls + ' overflow-hidden'}>
          {/* Nav semaine */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ChevronLeft size={16} /></button>
            <p className="text-sm font-bold text-foreground">
              {weekDates[0]} → {weekDates[6]}
            </p>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ChevronRight size={16} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/30">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground w-24 border-b border-r border-border">Poste</th>
                  {weekDates.map((d, i) => (
                    <th key={d} className="px-3 py-2.5 text-center text-xs font-semibold border-b border-r border-border last:border-r-0"
                      style={{ color: d === new Date().toISOString().split('T')[0] ? SARPA_PURPLE : 'var(--muted-foreground)' }}>
                      <span className="block">{JOURS_FR[i]}</span>
                      <span className="block font-normal">{d.slice(8)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFTS.map(shift => (
                  <tr key={shift} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 border-r border-border">
                      <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={SHIFT_COLOR[shift]}>{shift}</span>
                    </td>
                    {weekDates.map(date => {
                      const cell = entries.filter(e => e.date === date && e.shift === shift);
                      return (
                        <td key={date} className="px-2 py-2 border-r border-border last:border-r-0 align-top min-w-[120px]">
                          {cell.map(entry => {
                            const s = STATUT_CONFIG[entry.statut];
                            return (
                              <div key={entry.id} className="mb-1.5 p-2 rounded-lg text-xs" style={{ background: s.bg }}>
                                <div className="font-bold" style={{ color: s.color }}>{entry.beton_type} — {entry.quantite_prevue_m3}M3</div>
                                {entry.client && <div className="text-muted-foreground truncate">{entry.client}</div>}
                                <div className="text-muted-foreground">{entry.operateur}</div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'liste' && (
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                  {['Date', 'Poste', 'Type', 'Qté prévue', 'Réalisée', 'Commande', 'Client', 'Opérateur', 'Statut', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(e => {
                  const s = STATUT_CONFIG[e.statut];
                  const canAdvance = ['planifie', 'en_cours'].includes(e.statut);
                  return (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-foreground">{e.date}</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={SHIFT_COLOR[e.shift]}>{e.shift}</span></td>
                      <td className="px-4 py-3 font-bold" style={{ color: SARPA_PURPLE }}>{e.beton_type}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{e.quantite_prevue_m3} M3</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.quantite_realisee_m3 != null ? e.quantite_realisee_m3 + ' M3' : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{e.commande_ref || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.client || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.operateur}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.color }}>{s.label}</span></td>
                      <td className="px-4 py-3">
                        {canAdvance && (
                          <button onClick={() => advanceStatut(e.id)} className="text-xs px-2 py-1 rounded-lg font-semibold hover:opacity-80" style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>
                            {e.statut === 'planifie' ? '▶ Démarrer' : '✓ Terminer'}
                          </button>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Planifier une gâchée</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required /></div>
                <div><label className={labelCls}>Poste</label>
                  <select className={selectCls} value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value as Shift }))}>
                    {SHIFTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Type béton</label>
                  <select className={selectCls} value={form.beton_type} onChange={e => setForm(p => ({ ...p, beton_type: e.target.value }))}>
                    {['B20', 'B25', 'B30', 'B35', 'B40'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Quantité prévue (M3)</label><input type="number" min="1" className={inputCls} value={form.quantite_prevue_m3} onChange={e => setForm(p => ({ ...p, quantite_prevue_m3: e.target.value }))} required /></div>
                <div><label className={labelCls}>Réf. commande</label><input className={inputCls} value={form.commande_ref} onChange={e => setForm(p => ({ ...p, commande_ref: e.target.value }))} placeholder="CMD-2026-..." /></div>
                <div><label className={labelCls}>Client</label><input className={inputCls} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></div>
                <div className="col-span-2"><label className={labelCls}>Opérateur</label><input className={inputCls} value={form.operateur} onChange={e => setForm(p => ({ ...p, operateur: e.target.value }))} required /></div>
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
