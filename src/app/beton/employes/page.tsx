'use client';
import { useState } from 'react';
import { UserCircle2, Plus, X, Loader2, CheckCircle2, Phone, Search } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = 'hsl(var(--primary))';

type Poste = 'operateur_centrale' | 'chauffeur_toupie' | 'chauffeur_benne' | 'technicien_qualite' | 'mecanicien' | 'chef_equipe' | 'directeur_site' | 'commercial' | 'comptable' | 'autre';
type Contrat = 'CDI' | 'CDD' | 'Temporaire' | 'Stage';

interface Employe {
  id: string;
  nom: string;
  prenom: string;
  poste: Poste;
  contrat: Contrat;
  telephone?: string;
  date_embauche: string;
  salaire?: number;
  statut: 'actif' | 'conge' | 'inactif';
}

const POSTES: { value: Poste; label: string }[] = [
  { value: 'operateur_centrale', label: 'Opérateur centrale' },
  { value: 'chauffeur_toupie', label: 'Chauffeur toupie' },
  { value: 'chauffeur_benne', label: 'Chauffeur benne' },
  { value: 'technicien_qualite', label: 'Technicien qualité' },
  { value: 'mecanicien', label: 'Mécanicien' },
  { value: 'chef_equipe', label: "Chef d'équipe" },
  { value: 'directeur_site', label: 'Directeur de site' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'autre', label: 'Autre' },
];

const MOCK: Employe[] = [
  { id: '1', nom: 'Diallo', prenom: 'Mamadou', poste: 'operateur_centrale', contrat: 'CDI', telephone: '+221 77 100 11 22', date_embauche: '2020-03-01', salaire: 350000, statut: 'actif' },
  { id: '2', nom: 'Sow', prenom: 'Ibrahim', poste: 'operateur_centrale', contrat: 'CDI', telephone: '+221 76 200 22 33', date_embauche: '2021-06-15', salaire: 320000, statut: 'actif' },
  { id: '3', nom: 'Ndiaye', prenom: 'Pape', poste: 'chauffeur_toupie', contrat: 'CDI', telephone: '+221 77 300 33 44', date_embauche: '2019-01-10', salaire: 280000, statut: 'actif' },
  { id: '4', nom: 'Fall', prenom: 'Modou', poste: 'chauffeur_toupie', contrat: 'CDI', telephone: '+221 76 400 44 55', date_embauche: '2021-09-01', salaire: 270000, statut: 'actif' },
  { id: '5', nom: 'Ba', prenom: 'Mamadou', poste: 'chauffeur_toupie', contrat: 'CDI', telephone: '+221 77 500 55 66', date_embauche: '2022-02-14', salaire: 265000, statut: 'actif' },
  { id: '6', nom: 'Sow', prenom: 'Ibrahima', poste: 'chauffeur_toupie', contrat: 'CDD', telephone: '+221 76 600 66 77', date_embauche: '2025-07-01', salaire: 255000, statut: 'actif' },
  { id: '7', nom: 'Diop', prenom: 'Fatou', poste: 'technicien_qualite', contrat: 'CDI', telephone: '+221 77 700 77 88', date_embauche: '2022-05-01', salaire: 380000, statut: 'actif' },
  { id: '8', nom: 'Kamara', prenom: 'Moussa', poste: 'technicien_qualite', contrat: 'CDD', date_embauche: '2024-10-01', salaire: 350000, statut: 'actif' },
  { id: '9', nom: 'Badji', prenom: 'Oumar', poste: 'mecanicien', contrat: 'CDI', telephone: '+221 76 800 88 99', date_embauche: '2020-08-15', salaire: 310000, statut: 'actif' },
  { id: '10', nom: 'Sarr', prenom: 'Aminata', poste: 'comptable', contrat: 'CDI', telephone: '+221 77 900 99 00', date_embauche: '2023-01-03', salaire: 420000, statut: 'actif' },
  { id: '11', nom: 'Kane', prenom: 'Alioune', poste: 'directeur_site', contrat: 'CDI', date_embauche: '2018-06-01', salaire: 850000, statut: 'actif' },
];

const STATUT_CONFIG = {
  actif:   { label: 'Actif',   dot: '#22c55e' },
  conge:   { label: 'Congé',  dot: '#f59e0b' },
  inactif: { label: 'Inactif', dot: '#94a3b8' },
};

function getInitials(nom: string, prenom: string) {
  return (prenom[0] || '') + (nom[0] || '');
}

export default function EmployesPage() {
  const [employes, setEmployes] = useState<Employe[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPoste, setFilterPoste] = useState<Poste | 'tous'>('tous');
  const [selected, setSelected] = useState<Employe | null>(null);
  const [form, setForm] = useState({ nom: '', prenom: '', poste: 'operateur_centrale' as Poste, contrat: 'CDI' as Contrat, telephone: '', date_embauche: new Date().toISOString().split('T')[0], salaire: '' });

  const filtered = employes.filter(e => {
    const q = search.toLowerCase();
    return (!q || e.nom.toLowerCase().includes(q) || e.prenom.toLowerCase().includes(q))
      && (filterPoste === 'tous' || e.poste === filterPoste);
  });

  const masseSalariale = employes.filter(e => e.statut === 'actif' && e.salaire).reduce((s, e) => s + (e.salaire || 0), 0);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setEmployes(prev => [...prev, { id: Date.now().toString(), nom: form.nom, prenom: form.prenom, poste: form.poste, contrat: form.contrat, telephone: form.telephone || undefined, date_embauche: form.date_embauche, salaire: form.salaire ? Number(form.salaire) : undefined, statut: 'actif' }]);
    setForm({ nom: '', prenom: '', poste: 'operateur_centrale', contrat: 'CDI', telephone: '', date_embauche: new Date().toISOString().split('T')[0], salaire: '' });
    setShowForm(false); setSaving(false);
  }

  const COLORS = [SARPA_PURPLE, '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_PURPLE}, #1d4ed8)` }}>
          <UserCircle2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Employés</h1>
          <p className="text-sm text-muted-foreground">Personnel SARPA Béton</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Ajouter employé
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total effectif', value: employes.filter(e => e.statut === 'actif').length },
          { label: 'CDI / CDD', value: `${employes.filter(e => e.contrat === 'CDI').length} / ${employes.filter(e => e.contrat === 'CDD').length}` },
          { label: 'Masse salariale', value: new Intl.NumberFormat('fr-FR').format(masseSalariale) + ' F' },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-5'}>
            <p className="text-2xl font-black text-foreground">{k.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Rechercher employé..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls + ' w-auto'} value={filterPoste} onChange={e => setFilterPoste(e.target.value as any)}>
          <option value="tous">Tous les postes</option>
          {POSTES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div className={cardCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
                {['Employé', 'Poste', 'Contrat', 'Téléphone', 'Embauché le', 'Salaire', 'Statut'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const s = STATUT_CONFIG[e.statut];
                const posteLabel = POSTES.find(p => p.value === e.poste)?.label || e.poste;
                return (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer" onClick={() => setSelected(e)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}>
                          {getInitials(e.nom, e.prenom)}
                        </div>
                        <span className="font-semibold text-foreground">{e.prenom} {e.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{posteLabel}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: SARPA_PURPLE + '15', color: SARPA_PURPLE }}>{e.contrat}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{e.telephone || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.date_embauche}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{e.salaire ? new Intl.NumberFormat('fr-FR').format(e.salaire) + ' F' : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />{s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fiche employé */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Fiche employé</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black" style={{ background: SARPA_PURPLE }}>
                  {getInitials(selected.nom, selected.prenom)}
                </div>
                <div>
                  <p className="font-black text-xl text-foreground">{selected.prenom} {selected.nom}</p>
                  <p className="text-sm text-muted-foreground">{POSTES.find(p => p.value === selected.poste)?.label}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Contrat', value: selected.contrat },
                  { label: 'Statut', value: STATUT_CONFIG[selected.statut].label },
                  { label: 'Téléphone', value: selected.telephone || '—' },
                  { label: 'Embauché le', value: selected.date_embauche },
                  { label: 'Salaire', value: selected.salaire ? new Intl.NumberFormat('fr-FR').format(selected.salaire) + ' F' : '—' },
                ].map(row => (
                  <div key={row.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="font-semibold text-foreground mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
              <h3 className="font-bold text-foreground">Nouvel employé</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Prénom</label><input className={inputCls} value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} required /></div>
                <div><label className={labelCls}>Nom</label><input className={inputCls} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required /></div>
                <div><label className={labelCls}>Poste</label>
                  <select className={selectCls} value={form.poste} onChange={e => setForm(p => ({ ...p, poste: e.target.value as Poste }))}>
                    {POSTES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Contrat</label>
                  <select className={selectCls} value={form.contrat} onChange={e => setForm(p => ({ ...p, contrat: e.target.value as Contrat }))}>
                    {(['CDI', 'CDD', 'Temporaire', 'Stage'] as Contrat[]).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} /></div>
                <div><label className={labelCls}>Date embauche</label><input type="date" className={inputCls} value={form.date_embauche} onChange={e => setForm(p => ({ ...p, date_embauche: e.target.value }))} required /></div>
                <div className="col-span-2"><label className={labelCls}>Salaire mensuel (F CFA)</label><input type="number" min="0" className={inputCls} value={form.salaire} onChange={e => setForm(p => ({ ...p, salaire: e.target.value }))} /></div>
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
    </div>
  );
}
