'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, GripVertical, FileText, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, btnPrimary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

type Article = { id: string; title: string; content: string; expanded?: boolean };

const DEFAULT_ARTICLES: Article[] = [
  { id:'1', title:'Article 1 – Désignation du logement',        content:'Le bailleur loue au preneur, qui accepte, le bien immobilier désigné ci-après : [ADRESSE], composé de [DESCRIPTION].', expanded:false },
  { id:'2', title:'Article 2 – Durée du bail',                   content:'Le présent bail est consenti pour une durée de [DURÉE] mois, commençant le [DATE_DEBUT] et prenant fin le [DATE_FIN], renouvelable par tacite reconduction.', expanded:false },
  { id:'3', title:'Article 3 – Loyer et charges',                content:'Le loyer mensuel est fixé à [MONTANT] FCFA, payable le [JOUR] de chaque mois. Les charges locatives s\'élèvent à [CHARGES] FCFA par mois.', expanded:false },
  { id:'4', title:'Article 4 – Dépôt de garantie',               content:'Un dépôt de garantie d\'un montant de [CAUTION] FCFA est versé à la signature du présent bail. Il sera restitué dans un délai de [DELAI] jours après la restitution des clés.', expanded:false },
  { id:'5', title:'Article 5 – Obligations du locataire',         content:'Le locataire s\'engage à : user paisiblement des lieux, payer le loyer aux échéances convenues, entretenir les lieux en bon état, ne pas sous-louer sans accord écrit du bailleur.', expanded:false },
  { id:'6', title:'Article 6 – Obligations du bailleur',          content:'Le bailleur s\'engage à : délivrer un logement décent, assurer la jouissance paisible des lieux, effectuer les réparations nécessaires sauf celles incombant au locataire.', expanded:false },
  { id:'7', title:'Article 7 – Résiliation',                      content:'Le présent bail pourra être résilié par l\'une ou l\'autre des parties avec un préavis de [PREAVIS] jours, notifié par lettre recommandée.', expanded:false },
];

export default function ContractsPage() {
  const { company } = useAuthStore();
  const [articles, setArticles] = useState<Article[]>(DEFAULT_ARTICLES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!company?.id) return;
    createClient().from('companies').select('contract_template').eq('id', company.id).maybeSingle()
      .then(({ data }) => {
        const saved = (data as any)?.contract_template;
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setArticles(saved.map((a: Article) => ({ ...a, expanded: false })));
        }
        setLoading(false);
      });
  }, [company?.id]);

  const save = async () => {
    if (!company?.id) return;
    setSaving(true);
    const toSave = articles.map(({ expanded, ...a }) => a);
    const { error } = await createClient().from('companies')
      .update({ contract_template: toSave } as never).eq('id', company.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setHasChanges(false);
    toast.success('Modèle de contrat sauvegardé !');
  };

  const resetDefault = () => {
    setArticles(DEFAULT_ARTICLES);
    setHasChanges(true);
    toast('Articles remis par défaut');
  };

  const addArticle = () => {
    const n = articles.length + 1;
    setArticles(prev => [...prev, { id: Date.now().toString(), title:`Article ${n} – Nouveau`, content:'Rédigez le contenu de cet article...', expanded:true }]);
    setHasChanges(true);
  };

  const updateArticle = (id: string, key: 'title'|'content', value: string) => {
    setArticles(prev => prev.map(a => a.id===id ? {...a, [key]:value} : a));
    setHasChanges(true);
  };

  const removeArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id!==id));
    setHasChanges(true);
  };

  const toggle = (id: string) =>
    setArticles(prev => prev.map(a => a.id===id ? {...a, expanded:!a.expanded} : a));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...articles];
    [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
    setArticles(arr);
    setHasChanges(true);
  };

  const moveDown = (idx: number) => {
    if (idx === articles.length-1) return;
    const arr = [...articles];
    [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]];
    setArticles(arr);
    setHasChanges(true);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <PageHeader title="Modèle de contrat" subtitle="Personnalisez les articles selon votre juriste"
        actions={
          <div className="flex gap-3">
            <button onClick={resetDefault} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50 transition-colors">
              Réinitialiser
            </button>
            <button onClick={save} disabled={saving||!hasChanges} className={btnPrimary}>
              {saving ? <LoadingSpinner size={15}/> : <Save size={15}/>}
              {hasChanges ? 'Sauvegarder *' : 'Sauvegardé'}
            </button>
          </div>
        }
      />

      {/* Info banner */}
      <div className="mb-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5"/>
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Variables dynamiques disponibles</p>
          <p className="text-xs">Utilisez ces variables dans vos articles, elles seront remplacées automatiquement lors de la génération :</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['[LOCATAIRE]','[BAILLEUR]','[ADRESSE]','[LOYER]','[CHARGES]','[CAUTION]','[DATE_DEBUT]','[DATE_FIN]','[DUREE]','[JOUR_PAIEMENT]'].map(v=>(
              <code key={v} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 rounded text-[11px] font-mono">{v}</code>
            ))}
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-3 mb-5">
        {articles.map((article, idx) => (
          <div key={article.id} className={cardCls}>
            {/* Article header */}
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={()=>moveUp(idx)} disabled={idx===0} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronUp size={13}/>
                </button>
                <button onClick={()=>moveDown(idx)} disabled={idx===articles.length-1} className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronDown size={13}/>
                </button>
              </div>
              <GripVertical size={14} className="text-muted-foreground opacity-40 flex-shrink-0"/>

              {/* Title (editable) */}
              <input value={article.title} onChange={e=>updateArticle(article.id,'title',e.target.value)}
                className="flex-1 text-sm font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary rounded px-1"
                placeholder="Titre de l'article"/>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={()=>toggle(article.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  {article.expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                </button>
                <button onClick={()=>removeArticle(article.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Supprimer">
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>

            {/* Content (collapsible) */}
            {article.expanded && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <label className={labelCls}>Contenu de l'article</label>
                <textarea value={article.content} onChange={e=>updateArticle(article.id,'content',e.target.value)}
                  rows={5} className={inputCls+' resize-y font-mono text-sm'}
                  placeholder="Rédigez le contenu de l'article..."/>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add article */}
      <button onClick={addArticle}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
        <Plus size={16}/> Ajouter un article
      </button>

      {/* Preview info */}
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText size={13}/>
        <span>Ce modèle sera utilisé pour générer les contrats PDF depuis la page des baux.</span>
      </div>
    </div>
  );
}