'use client';
import { BarChart3, TrendingUp, TrendingDown, Gauge, Truck, FlaskConical, Banknote } from 'lucide-react';
import { cardCls } from '@/components/ui';

const SARPA_PURPLE = '#3d2d7d';
const SARPA_YELLOW = '#faab2d';

const MONTHLY_PROD = [
  { mois: 'Oct', m3: 820 },
  { mois: 'Nov', m3: 950 },
  { mois: 'Déc', m3: 780 },
  { mois: 'Jan', m3: 1020 },
  { mois: 'Fév', m3: 1150 },
  { mois: 'Mar', m3: 1380 },
];

const BETON_TYPES = [
  { type: 'B25', pct: 42, m3: 580, color: SARPA_PURPLE },
  { type: 'B30', pct: 35, m3: 483, color: SARPA_YELLOW },
  { type: 'B35', pct: 15, m3: 207, color: '#0ea5e9' },
  { type: 'B40', pct: 8,  m3: 110, color: '#22c55e' },
];

const LIVRAISONS_HEBDO = [
  { jour: 'Lun', livraisons: 8 },
  { jour: 'Mar', livraisons: 12 },
  { jour: 'Mer', livraisons: 9 },
  { jour: 'Jeu', livraisons: 14 },
  { jour: 'Ven', livraisons: 11 },
  { jour: 'Sam', livraisons: 6 },
  { jour: 'Dim', livraisons: 0 },
];

const maxProd = Math.max(...MONTHLY_PROD.map(m => m.m3));
const maxLiv = Math.max(...LIVRAISONS_HEBDO.map(d => d.livraisons));

export default function StatsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_PURPLE}, #5b3ea8)` }}>
          <BarChart3 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Analyse des performances SARPA Béton</p>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Gauge size={18} />, label: 'Production mars', value: '1 380 M3', trend: +9.6, color: SARPA_PURPLE },
          { icon: <FlaskConical size={18} />, label: 'Taux conformité', value: '97.2%', trend: +1.1, color: '#22c55e' },
          { icon: <Truck size={18} />, label: 'Livraisons mars', value: '87', trend: +12.3, color: '#0ea5e9' },
          { icon: <Banknote size={18} />, label: 'CA mars', value: '116 M F', trend: +18.4, color: SARPA_YELLOW },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.color + '15' }}>
                <span style={{ color: k.color }}>{k.icon}</span>
              </div>
              <span className="flex items-center gap-0.5 text-xs font-bold" style={{ color: k.trend >= 0 ? '#22c55e' : '#ef4444' }}>
                {k.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {k.trend >= 0 ? '+' : ''}{k.trend}%
              </span>
            </div>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Production mensuelle */}
      <div className={cardCls + ' p-5'}>
        <h3 className="text-sm font-bold text-foreground mb-5">Production mensuelle (M3)</h3>
        <div className="flex items-end gap-3 h-40">
          {MONTHLY_PROD.map(m => (
            <div key={m.mois} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">{m.m3}</span>
              <div className="w-full rounded-t-lg transition-all" style={{ height: `${(m.m3 / maxProd) * 120}px`, background: `linear-gradient(180deg, ${SARPA_PURPLE}, #5b3ea8)` }} />
              <span className="text-xs text-muted-foreground">{m.mois}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition par type */}
        <div className={cardCls + ' p-5'}>
          <h3 className="text-sm font-bold text-foreground mb-4">Répartition par type (mars)</h3>
          <div className="space-y-3">
            {BETON_TYPES.map(b => (
              <div key={b.type}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{b.type}</span>
                  <span className="text-muted-foreground">{b.m3} M3 ({b.pct}%)</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Livraisons par jour de semaine */}
        <div className={cardCls + ' p-5'}>
          <h3 className="text-sm font-bold text-foreground mb-5">Livraisons par jour (semaine en cours)</h3>
          <div className="flex items-end gap-2 h-32">
            {LIVRAISONS_HEBDO.map(d => (
              <div key={d.jour} className="flex-1 flex flex-col items-center gap-1">
                {d.livraisons > 0 && <span className="text-xs font-bold text-foreground">{d.livraisons}</span>}
                <div className="w-full rounded-t-lg" style={{ height: `${maxLiv ? (d.livraisons / maxLiv) * 90 : 0}px`, background: d.livraisons > 0 ? SARPA_YELLOW : '#e2e8f0' }} />
                <span className="text-xs text-muted-foreground">{d.jour}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau récap mensuel */}
      <div className={cardCls}>
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Récapitulatif mensuel</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                {['Mois', 'Production (M3)', 'Livraisons', 'Taux conformité', 'CA estimé'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...MONTHLY_PROD].reverse().map(m => (
                <tr key={m.mois} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="px-4 py-3 font-semibold text-foreground">{m.mois} 2026</td>
                  <td className="px-4 py-3 font-bold" style={{ color: SARPA_PURPLE }}>{m.m3}</td>
                  <td className="px-4 py-3 text-muted-foreground">{Math.round(m.m3 / 15)}</td>
                  <td className="px-4 py-3 text-foreground">
                    <span style={{ color: '#22c55e' }}>{(94 + Math.random() * 4).toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Intl.NumberFormat('fr-FR').format(Math.round(m.m3 * 82000))} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
