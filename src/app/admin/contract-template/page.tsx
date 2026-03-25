'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, GripVertical, Save, Eye, ChevronDown, ChevronUp, Info, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, cardCls, btnPrimary } from '@/components/ui';
import type { ContractArticle } from '@/lib/types';

const DEFAULT_ARTICLES: ContractArticle[] = [
  { num: '6', title: 'Obligations du locataire', content: `- Payer le loyer et charges au plus tard le {{jour_paiement}} de chaque mois.\n- User paisiblement du logement conformement a sa destination d'habitation.\n- Entretenir le logement et effectuer les reparations locatives a sa charge.\n- Ne pas effectuer de travaux sans accord ecrit prealable du bailleur.\n- Ne pas sous-louer sans autorisation ecrite du bailleur.\n- Respecter la tranquillite du voisinage et le reglement de l'immeuble.\n- Souscrire une assurance habitation et en justifier sur demande.\n- Restituer le logement en bon etat a la fin du bail.` },
  { num: '7', title: 'Obligations du bailleur', content: `- Delivrer un logement en bon etat d'usage a la date de prise d'effet du bail.\n- Garantir la jouissance paisible du logement pendant toute la duree du bail.\n- Effectuer les grosses reparations (toiture, structure, canalisations, etc.).\n- Restituer le depot de garantie dans les delais, deduction des sommes dues.` },
  { num: '8', title: 'Resiliation du bail', content: `- Locataire : preavis d'un (1) mois par lettre recommandee ou remise en main propre.\n- Bailleur : preavis de trois (3) mois pour non-paiement ou reprise personnelle.\n- Depot de garantie restitue sous un (1) mois apres remise des cles.` },
  { num: '9', title: 'Penalites de retard', content: `Tout retard au-dela de dix (10) jours entraine une penalite de 5% du loyer mensuel, soit {{penalite}} par mois de retard, de plein droit et sans mise en demeure prealable.` },
  { num: '10', title: 'Reglement des litiges', content: `Tout litige sera soumis au Tribunal competent du Senegal apres tentative de resolution amiable dans un delai de trente (30) jours.` },
  { num: '11', title: 'Clauses particulieres', content: `- Les animaux domestiques sont toleres sous reserve de ne pas causer de nuisance.\n- Toute modification fera l'objet d'un avenant ecrit signe par les deux parties.\n- Contrat etabli en deux (2) exemplaires originaux, un pour chaque partie.` },
];

const VARIABLES = [
  { v: '{{locataire}}',     label: 'Nom du locataire' },
  { v: '{{bailleur}}',      label: 'Nom du bailleur' },
  { v: '{{bien}}',          label: 'Nom du bien' },
  { v: '{{adresse}}',       label: 'Adresse du bien' },
  { v: '{{ville}}',         label: 'Ville' },
  { v: '{{loyer}}',         label: 'Montant loyer' },
  { v: '{{charges}}',       label: 'Montant charges' },
  { v: '{{total}}',         label: 'Total mensuel' },
  { v: '{{depot}}',         label: 'Depot de garantie' },
  { v: '{{debut}}',         label: 'Date debut' },
  { v: '{{fin}}',           label: 'Date fin' },
  { v: '{{jour_paiement}}', label: 'Jour de paiement' },
  { v: '{{penalite}}',      label: 'Montant penalite (5%)' },
];

export default function ContractTemplatePage() {
  const { company } = useAuthStore();
  const [articles, setArticles] = useState<ContractArticle[]>(DEFAULT_ARTICLES);
  const [specialConditions, setSpecialConditions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('companies').select('settings').eq('id', company.id).single().then(({ data }) => {
      if (data?.settings?.contract_template) {
        const tpl = data.settings.contract_template as any;
        if (tpl.articles?.length) setArticles(tpl.articles);
        if (tpl.specialConditions) setSpecialConditions(tpl.specialConditions);
      }
      setLoading(false);
    });
  }, [company?.id]);

  const save = async () => {
    if (!company?.id) return;
    setSaving(true);
    const sb = createClient();
    
    // Fetch current settings to preserve other fields
    const { data: current } = await sb.from('companies')
      .select('settings').eq('id', company.id).single();
    
    const currentSettings = (current?.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      contract_template: { articles, specialConditions }
    };
    
    const { error } = await sb.from('companies')
      .update({ settings: updatedSettings })
      .eq('id', company.id);
    
    if (error) toast.error('Erreur sauvegarde');
    else toast.success('Modele de contrat sauvegarde !');
    setSaving(false);
  };

  const addArticle = () => {
    const newNum = String(articles.length + 6);
    setArticles(a => [...a, { num: newNum, title: 'Nouvel article', content: '' }]);
    setOpenIdx(articles.length);
  };

  const removeArticle = (i: number) => {
    setArticles(a => a.filter((_, idx) => idx !== i));
    setOpenIdx(null);
  };

  const updateArticle = (i: number, field: keyof ContractArticle, val: string) => {
    setArticles(a => a.map((art, idx) => idx === i ? { ...art, [field]: val } : art));
  };

  const insertVar = (i: number, v: string) => {
    const ta = document.getElementById('textarea-' + i) as HTMLTextAreaElement | null;
    if (!ta) {
      updateArticle(i, 'content', articles[i].content + v);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const content = articles[i].content;
    updateArticle(i, 'content', content.slice(0, start) + v + content.slice(end));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length); }, 10);
  };

  const resetToDefault = () => {
    if (!confirm('Reinitialiser aux articles par defaut ?')) return;
    setArticles(DEFAULT_ARTICLES);
    setSpecialConditions('');
    toast.success('Articles reinitialises');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Modele de contrat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Personnalisez les articles selon votre juriste. Utilisez les variables pour injecter les donnees dynamiquement.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetToDefault} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-slate-50 transition-colors">
            <RefreshCw size={14}/> Reinitialiser
          </button>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? <LoadingSpinner size={14}/> : <Save size={14}/>} Sauvegarder
          </button>
        </div>
      </div>

      {/* Variables reference */}
      <div className={cardCls + ' p-4'}>
        <button onClick={() => setShowVars(v => !v)} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info size={15} className="text-primary"/> Variables disponibles
          </div>
          {showVars ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>
        {showVars && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VARIABLES.map(v => (
              <div key={v.v} className="flex flex-col bg-slate-50 dark:bg-slate-700/30 rounded-xl p-2.5">
                <code className="text-xs font-mono text-primary bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md mb-1">{v.v}</code>
                <span className="text-xs text-muted-foreground">{v.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Astuce */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 text-xs text-amber-800 dark:text-amber-300">
        <strong>Astuce :</strong> Commencez une ligne par <code className="bg-amber-100 px-1 rounded">- </code> pour creer une puce. Utilisez les variables entre doubles accolades pour injecter les donnees du bail.
      </div>

      {/* Articles */}
      <div className="space-y-3">
        {articles.map((art, i) => (
          <div key={i} className={cardCls + ' overflow-hidden'}>
            {/* Article header */}
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left">
              <GripVertical size={16} className="text-slate-300 flex-shrink-0"/>
              <div className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                {art.num}
              </div>
              <span className="flex-1 font-medium text-foreground text-sm">{art.title || 'Sans titre'}</span>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); removeArticle(i); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={14}/>
                </button>
                {openIdx === i ? <ChevronUp size={16} className="text-muted-foreground"/> : <ChevronDown size={16} className="text-muted-foreground"/>}
              </div>
            </button>

            {/* Article body */}
            {openIdx === i && (
              <div className="border-t border-border p-4 space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Numéro</label>
                    <input value={art.num} onChange={e => updateArticle(i, 'num', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Titre de l&apos;article</label>
                    <input value={art.title} onChange={e => updateArticle(i, 'title', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"/>
                  </div>
                </div>

                {/* Variables shortcuts */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Insérer une variable :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map(v => (
                      <button key={v.v} onClick={() => insertVar(i, v.v)} type="button"
                        className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary hover:bg-blue-100 transition-colors font-mono">
                        {v.v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Contenu — une ligne par paragraphe, commencez par <code className="bg-slate-100 px-1 rounded">- </code> pour une puce
                  </label>
                  <textarea id={'textarea-' + i} value={art.content}
                    onChange={e => updateArticle(i, 'content', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none resize-y"/>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ajouter article */}
      <button onClick={addArticle}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm">
        <Plus size={16}/> Ajouter un article
      </button>

      {/* Conditions speciales */}
      <div className={cardCls + ' p-5'}>
        <h3 className="font-semibold text-foreground mb-1 text-sm">Conditions speciales</h3>
        <p className="text-xs text-muted-foreground mb-3">Texte ajouté en fin de contrat — spécificités de votre entreprise.</p>
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {VARIABLES.slice(0,6).map(v => (
            <button key={v.v} onClick={() => setSpecialConditions(c => c + v.v)} type="button"
              className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary hover:bg-blue-100 transition-colors font-mono">
              {v.v}
            </button>
          ))}
        </div>
        <textarea value={specialConditions} onChange={e => setSpecialConditions(e.target.value)}
          rows={4} placeholder="Ex: Le locataire s'engage à entretenir le jardin..."
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-y"/>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className={btnPrimary}>
          {saving ? <LoadingSpinner size={14}/> : <Save size={14}/>} Sauvegarder le modele
        </button>
      </div>
    </div>
  );
}