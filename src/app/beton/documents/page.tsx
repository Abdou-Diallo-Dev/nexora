'use client';
import { useState } from 'react';
import { FolderOpen, Plus, X, Upload, Loader2, CheckCircle2, Download, Eye, Search, FileText, FileImage } from 'lucide-react';
import { cardCls, inputCls, selectCls, labelCls, btnPrimary, btnSecondary } from '@/components/ui';

const SARPA_PURPLE = 'hsl(var(--primary))';
const SARPA_YELLOW = 'hsl(var(--secondary))';

type CategorieDoc = 'bon_livraison' | 'facture' | 'certificat_qualite' | 'fiche_securite' | 'contrat' | 'document_vehicule' | 'autre';
type StatutDoc = 'valide' | 'expire' | 'archive';

interface Document {
  id: string;
  nom: string;
  categorie: CategorieDoc;
  reference?: string;
  date_upload: string;
  date_expiration?: string;
  taille: string;
  type_fichier: 'pdf' | 'image' | 'autre';
  statut: StatutDoc;
  tags?: string[];
}

const CAT_CONFIG: Record<CategorieDoc, { label: string; color: string; bg: string; icon: string }> = {
  bon_livraison:      { label: 'Bon de livraison',    color: '#0ea5e9', bg: '#0ea5e915', icon: '🚛' },
  facture:            { label: 'Facture',              color: '#22c55e', bg: '#22c55e15', icon: '💰' },
  certificat_qualite: { label: 'Certificat qualité',  color: '#8b5cf6', bg: '#8b5cf615', icon: '🏅' },
  fiche_securite:     { label: 'Fiche sécurité',      color: '#ef4444', bg: '#ef444415', icon: '⚠️' },
  contrat:            { label: 'Contrat',              color: SARPA_PURPLE, bg: SARPA_PURPLE + '15', icon: '📝' },
  document_vehicule:  { label: 'Document véhicule',   color: '#64748b', bg: '#64748b15', icon: '🚗' },
  autre:              { label: 'Autre',                color: '#94a3b8', bg: '#94a3b815', icon: '📄' },
};

const MOCK: Document[] = [
  { id: '1', nom: 'BL-2026-089 — Diallo Construction.pdf', categorie: 'bon_livraison', reference: 'BL-2026-089', date_upload: '2026-03-26', taille: '182 Ko', type_fichier: 'pdf', statut: 'valide' },
  { id: '2', nom: 'FAC-2026-041 — BTP Sénégal.pdf', categorie: 'facture', reference: 'FAC-2026-041', date_upload: '2026-03-22', taille: '245 Ko', type_fichier: 'pdf', statut: 'valide' },
  { id: '3', nom: 'Certificat conformité G-2026-044 B30.pdf', categorie: 'certificat_qualite', reference: 'G-2026-044', date_upload: '2026-03-25', taille: '98 Ko', type_fichier: 'pdf', statut: 'valide', tags: ['B30', 'AGEROUTE'] },
  { id: '4', nom: 'Assurance DK-5421-A 2026.pdf', categorie: 'document_vehicule', reference: 'DK-5421-A', date_upload: '2026-01-02', date_expiration: '2026-12-31', taille: '1.2 Mo', type_fichier: 'pdf', statut: 'valide' },
  { id: '5', nom: 'Assurance DK-5424-A 2025.pdf', categorie: 'document_vehicule', reference: 'DK-5424-A', date_upload: '2025-01-02', date_expiration: '2025-12-31', taille: '1.1 Mo', type_fichier: 'pdf', statut: 'expire' },
  { id: '6', nom: 'Contrat fournisseur SOCOCIM 2026.pdf', categorie: 'contrat', date_upload: '2026-01-15', date_expiration: '2026-12-31', taille: '380 Ko', type_fichier: 'pdf', statut: 'valide', tags: ['SOCOCIM', 'Ciment'] },
  { id: '7', nom: 'Fiche sécurité béton frais.pdf', categorie: 'fiche_securite', date_upload: '2025-06-01', taille: '210 Ko', type_fichier: 'pdf', statut: 'valide' },
  { id: '8', nom: 'Photo chantier immeuble Plateau.jpg', categorie: 'autre', reference: 'CMD-2026-041', date_upload: '2026-03-23', taille: '3.4 Mo', type_fichier: 'image', statut: 'valide', tags: ['BTP Sénégal'] },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(MOCK);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<CategorieDoc | 'tous'>('tous');
  const [form, setForm] = useState({ nom: '', categorie: 'bon_livraison' as CategorieDoc, reference: '', date_expiration: '' });

  const filtered = documents.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.nom.toLowerCase().includes(q) || (d.reference || '').toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q)))
      && (filterCat === 'tous' || d.categorie === filterCat);
  });

  const expires = documents.filter(d => d.statut === 'expire').length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setDocuments(prev => [{
      id: Date.now().toString(), nom: form.nom, categorie: form.categorie,
      reference: form.reference || undefined, date_upload: new Date().toISOString().split('T')[0],
      date_expiration: form.date_expiration || undefined, taille: '—', type_fichier: 'pdf', statut: 'valide',
    }, ...prev]);
    setForm({ nom: '', categorie: 'bon_livraison', reference: '', date_expiration: '' });
    setShowForm(false); setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${SARPA_YELLOW}, #f59e0b)` }}>
          <FolderOpen size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Gestion Documentaire</h1>
          <p className="text-sm text-muted-foreground">Bons de livraison, certificats, contrats et plus</p>
        </div>
        <button onClick={() => setShowForm(true)} className={btnPrimary + ' ml-auto'} style={{ background: SARPA_PURPLE }}>
          <Plus size={16} /> Ajouter document
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total documents', value: documents.length },
          { label: 'BL & Factures', value: documents.filter(d => ['bon_livraison', 'facture'].includes(d.categorie)).length },
          { label: 'Certificats qualité', value: documents.filter(d => d.categorie === 'certificat_qualite').length },
          { label: 'Documents expirés', value: expires, color: expires > 0 ? '#ef4444' : undefined },
        ].map(k => (
          <div key={k.label} className={cardCls + ' p-4'}>
            <p className="text-2xl font-black" style={{ color: k.color || 'var(--foreground)' }}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Rechercher document, référence, tag..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectCls + ' w-auto'} value={filterCat} onChange={e => setFilterCat(e.target.value as any)}>
          <option value="tous">Toutes catégories</option>
          {(Object.keys(CAT_CONFIG) as CategorieDoc[]).map(c => <option key={c} value={c}>{CAT_CONFIG[c].label}</option>)}
        </select>
      </div>

      {/* Catégories rapides */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('tous')} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={filterCat === 'tous' ? { background: SARPA_PURPLE, color: '#fff' } : { background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          Tous ({documents.length})
        </button>
        {(Object.keys(CAT_CONFIG) as CategorieDoc[]).map(c => {
          const count = documents.filter(d => d.categorie === c).length;
          if (!count) return null;
          return (
            <button key={c} onClick={() => setFilterCat(c)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filterCat === c ? { background: CAT_CONFIG[c].color, color: '#fff' } : { background: CAT_CONFIG[c].bg, color: CAT_CONFIG[c].color }}>
              {CAT_CONFIG[c].icon} {CAT_CONFIG[c].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className={cardCls}>
        <div className="divide-y divide-border">
          {filtered.map(d => {
            const cat = CAT_CONFIG[d.categorie];
            const isExpire = d.statut === 'expire';
            return (
              <div key={d.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: cat.bg }}>
                  {d.type_fichier === 'image' ? '🖼️' : cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{d.nom}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    {d.reference && <span className="text-xs text-muted-foreground font-mono">{d.reference}</span>}
                    {d.tags?.map(t => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-muted-foreground">{t}</span>)}
                    {isExpire && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-red-50 dark:bg-red-900/20 text-red-600">Expiré</span>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                  <p>{d.date_upload}</p>
                  <p>{d.taille}</p>
                  {d.date_expiration && <p className={isExpire ? 'text-red-500 font-bold' : ''}>Exp: {d.date_expiration}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Voir"><Eye size={14} /></button>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Télécharger"><Download size={14} /></button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-20 text-foreground" />
              <p className="text-sm text-muted-foreground">Aucun document trouvé</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Ajouter un document</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div><label className={labelCls}>Nom du document</label><input className={inputCls} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required placeholder="ex: BL-2026-100 — Client X.pdf" /></div>
              <div><label className={labelCls}>Catégorie</label>
                <select className={selectCls} value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value as CategorieDoc }))}>
                  {(Object.keys(CAT_CONFIG) as CategorieDoc[]).map(c => <option key={c} value={c}>{CAT_CONFIG[c].icon} {CAT_CONFIG[c].label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Référence</label><input className={inputCls} value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="BL-..., FAC-..." /></div>
                <div><label className={labelCls}>Date expiration</label><input type="date" className={inputCls} value={form.date_expiration} onChange={e => setForm(p => ({ ...p, date_expiration: e.target.value }))} /></div>
              </div>
              {/* Zone d'upload simulée */}
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors" style={{ borderColor: SARPA_PURPLE + '40' }}>
                <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cliquer pour sélectionner un fichier</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — Max 10 Mo</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary + ' flex-1'}>Annuler</button>
                <button type="submit" disabled={saving} className={btnPrimary + ' flex-1 justify-center'} style={{ background: SARPA_PURPLE }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Upload...</> : <><CheckCircle2 size={14} /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
