'use client';
import { useState } from 'react';
import { FileBarChart, Download, Eye, Calendar, Loader2 } from 'lucide-react';
import { cardCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = 'hsl(var(--primary))';
const SARPA_YELLOW = 'hsl(var(--secondary))';

type TypeRapport = 'production_mensuel' | 'qualite_mensuel' | 'livraisons_hebdo' | 'stock_snapshot' | 'finance_mensuel' | 'accidents_trimestriel' | 'maintenance_mensuel';

interface RapportConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
}

const RAPPORTS: Record<TypeRapport, RapportConfig> = {
  production_mensuel:     { label: 'Production mensuelle', description: 'Résumé des gâchées, quantités et conformité par type de béton', icon: '🏗️', color: SARPA_PURPLE },
  qualite_mensuel:        { label: 'Qualité mensuelle',    description: 'Résultats des tests, taux de conformité et non-conformités', icon: '🧪', color: '#8b5cf6' },
  livraisons_hebdo:       { label: 'Livraisons hebdo',     description: 'Bons de livraison, clients, distances et volumes livrés', icon: '🚛', color: '#0ea5e9' },
  stock_snapshot:         { label: 'État des stocks',      description: 'Snapshot des stocks matières premières et produits finis', icon: '📦', color: '#f59e0b' },
  finance_mensuel:        { label: 'Finance mensuelle',    description: 'Recettes, dépenses, marges et trésorerie du mois', icon: '💰', color: '#22c55e' },
  accidents_trimestriel:  { label: 'Accidents trimestriel','description': 'Bilan sécurité et incidents du trimestre', icon: '⚠️', color: '#ef4444' },
  maintenance_mensuel:    { label: 'Maintenance mensuelle', description: 'Interventions réalisées, coûts et état de la flotte', icon: '🔧', color: '#64748b' },
};

interface RapportGenere {
  id: string;
  type: TypeRapport;
  label: string;
  periode: string;
  date_generation: string;
  taille: string;
}

const HISTORIQUE: RapportGenere[] = [
  { id: '1', type: 'production_mensuel',  label: 'Production mensuelle', periode: 'Février 2026', date_generation: '2026-03-05', taille: '245 Ko' },
  { id: '2', type: 'finance_mensuel',     label: 'Finance mensuelle',    periode: 'Février 2026', date_generation: '2026-03-05', taille: '312 Ko' },
  { id: '3', type: 'qualite_mensuel',     label: 'Qualité mensuelle',    periode: 'Février 2026', date_generation: '2026-03-06', taille: '198 Ko' },
  { id: '4', type: 'maintenance_mensuel', label: 'Maintenance mensuelle', periode: 'Janvier 2026', date_generation: '2026-02-05', taille: '178 Ko' },
];

export default function RapportsPage() {
  const [historique, setHistorique] = useState<RapportGenere[]>(HISTORIQUE);
  const [generating, setGenerating] = useState<TypeRapport | null>(null);
  const [periode, setPeriode] = useState('2026-03');

  async function generer(type: TypeRapport) {
    setGenerating(type);
    await new Promise(r => setTimeout(r, 1500));
    const [year, month] = periode.split('-');
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const periodeLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
    setHistorique(prev => [{
      id: Date.now().toString(),
      type,
      label: RAPPORTS[type].label,
      periode: periodeLabel,
      date_generation: new Date().toISOString().split('T')[0],
      taille: `${180 + Math.floor(Math.random() * 200)} Ko`,
    }, ...prev]);
    setGenerating(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_PURPLE}, #1d4ed8)` }}>
          <FileBarChart size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Rapports</h1>
          <p className="text-sm text-muted-foreground">Génération et téléchargement des rapports SARPA Béton</p>
        </div>
      </div>

      {/* Période */}
      <div className={cardCls + ' p-5'}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <label className="text-sm font-semibold text-foreground">Période :</label>
          </div>
          <input type="month" className="px-3 py-2 border border-border rounded-xl text-sm text-foreground bg-white dark:bg-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={periode} onChange={e => setPeriode(e.target.value)} />
          <p className="text-xs text-muted-foreground ml-2">Sélectionnez la période avant de générer</p>
        </div>
      </div>

      {/* Grille de rapports disponibles */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Rapports disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(Object.keys(RAPPORTS) as TypeRapport[]).map(type => {
            const r = RAPPORTS[type];
            const isGenerating = generating === type;
            return (
              <div key={type} className={cardCls + ' p-5'}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <p className="font-bold text-foreground text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                </div>
                <button onClick={() => generer(type)} disabled={isGenerating || generating !== null}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: r.color, color: '#fff' }}>
                  {isGenerating ? (
                    <><Loader2 size={14} className="animate-spin" /> Génération...</>
                  ) : (
                    <><Download size={14} /> Générer PDF</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historique */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Rapports générés</h2>
        <div className={cardCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                  {['Rapport', 'Période', 'Généré le', 'Taille', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historique.map(r => {
                  const cfg = RAPPORTS[r.type];
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg?.icon || '📄'}</span>
                          <span className="font-medium text-foreground">{r.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.periode}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.date_generation}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.taille}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold hover:opacity-80" style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>
                            <Eye size={12} /> Voir
                          </button>
                          <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold hover:opacity-80 bg-slate-100 dark:bg-slate-700 text-muted-foreground">
                            <Download size={12} /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {historique.length === 0 && (
              <div className="py-12 text-center">
                <FileBarChart size={32} className="mx-auto mb-3 opacity-20 text-foreground" />
                <p className="text-sm text-muted-foreground">Aucun rapport généré pour l'instant</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
