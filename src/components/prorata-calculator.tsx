'use client';
import { useState, useEffect } from 'react';
import { Calculator, Info } from 'lucide-react';
import { calculateProrata } from '@/lib/pdf';

interface ProrataBannerProps {
  rentAmount: number;
  startDate?: string;        // ISO date string du début du bail
  onAmountCalculated?: (amount: number, isProrata: boolean) => void;
}

export function ProrataBanner({ rentAmount, startDate, onAmountCalculated }: ProrataBannerProps) {
  const [result, setResult] = useState<ReturnType<typeof calculateProrata> | null>(null);

  useEffect(() => {
    if (!startDate || !rentAmount) return;
    const date = new Date(startDate);
    const calc = calculateProrata({
      rentAmount,
      startDay: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
    setResult(calc);
    onAmountCalculated?.(calc.amount, calc.isProrata);
  }, [startDate, rentAmount]);

  if (!result) return null;

  return (
    <div className={`rounded-xl p-4 border ${result.isProrata ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'}`}>
      <div className="flex items-start gap-3">
        <Calculator size={18} className={result.isProrata ? 'text-amber-600 flex-shrink-0 mt-0.5' : 'text-green-600 flex-shrink-0 mt-0.5'}/>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${result.isProrata ? 'text-amber-800 dark:text-amber-200' : 'text-green-800 dark:text-green-200'}`}>
            {result.isProrata ? '📊 Prorata calculé automatiquement' : '✅ Loyer complet (entrée ≤ 5 du mois)'}
          </p>
          {result.isProrata ? (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-muted-foreground">Loyer mensuel</p>
                <p className="font-bold text-foreground">{rentAmount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-muted-foreground">Taux journalier</p>
                <p className="font-bold text-foreground">{result.dailyRate.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-muted-foreground">Jours occupés</p>
                <p className="font-bold text-foreground">{result.daysOccupied} / {result.totalDays}</p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-2 text-center border border-amber-300 dark:border-amber-700">
                <p className="text-amber-700 dark:text-amber-300 font-medium">Montant dû</p>
                <p className="font-bold text-amber-900 dark:text-amber-100 text-base">{result.amount.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Entrée entre le 1er et le 5 → loyer complet : <strong>{rentAmount.toLocaleString('fr-FR')} FCFA</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Calculateur standalone (page dédiée ou modale) ───────────
export function ProrataCalculator() {
  const [rentAmount, setRentAmount] = useState('');
  const [startDay, setStartDay]     = useState('');
  const [month, setMonth]           = useState(String(new Date().getMonth() + 1));
  const [year, setYear]             = useState(String(new Date().getFullYear()));
  const [result, setResult]         = useState<ReturnType<typeof calculateProrata> | null>(null);

  const calculate = () => {
    if (!rentAmount || !startDay) return;
    const r = calculateProrata({
      rentAmount: Number(rentAmount),
      startDay: Number(startDay),
      month: Number(month),
      year: Number(year),
    });
    setResult(r);
  };

  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Loyer mensuel (FCFA)</label>
          <input type="number" value={rentAmount} onChange={e => setRentAmount(e.target.value)}
            placeholder="120000" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Jour d'entrée</label>
          <input type="number" min="1" max="31" value={startDay} onChange={e => setStartDay(e.target.value)}
            placeholder="Ex: 15" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Mois</label>
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            {MONTHS.map((m, i) => <option key={i} value={String(i+1)}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Année</label>
          <input type="number" value={year} onChange={e => setYear(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-start gap-2">
        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Règle appliquée :</strong> Entrée du 1er au 5 → loyer complet. À partir du 6 → prorata calculé sur les jours occupés.
        </p>
      </div>

      <button onClick={calculate} disabled={!rentAmount || !startDay}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        <Calculator size={16}/> Calculer
      </button>

      {result && (
        <div className={`rounded-xl p-4 border ${result.isProrata ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          {result.isProrata ? (
            <>
              <p className="text-sm font-bold text-amber-800 mb-3">📊 Prorata activé</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-amber-700">Loyer mensuel :</span><span className="font-semibold">{Number(rentAmount).toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between"><span className="text-amber-700">Jours dans le mois :</span><span className="font-semibold">{result.totalDays} jours</span></div>
                <div className="flex justify-between"><span className="text-amber-700">Loyer journalier :</span><span className="font-semibold">{result.dailyRate.toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between"><span className="text-amber-700">Jours occupés :</span><span className="font-semibold">{result.daysOccupied} jours (du {startDay} au {result.totalDays})</span></div>
                <div className="flex justify-between pt-2 border-t border-amber-300">
                  <span className="font-bold text-amber-800">Montant à payer :</span>
                  <span className="font-bold text-lg text-amber-900">{result.amount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <p className="text-xs text-amber-600 mt-1 text-center">
                  {result.dailyRate.toLocaleString('fr-FR')} × {result.daysOccupied} jours = {result.amount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-green-800 mb-2">✅ Loyer complet applicable</p>
              <p className="text-xs text-green-700">Entrée le {startDay} du mois (≤ 5) → pas de prorata.</p>
              <div className="flex justify-between pt-2 border-t border-green-300 mt-2">
                <span className="font-bold text-green-800">Montant à payer :</span>
                <span className="font-bold text-lg text-green-900">{result.amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}