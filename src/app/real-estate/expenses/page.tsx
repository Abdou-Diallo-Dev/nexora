'use client';
import { useEffect, useState } from 'react';
import { Plus, Receipt, Trash2, X, Building2, Briefcase, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Expense = { id:string; type:'bailleur'|'entreprise'; category:string|null; amount:number; description:string|null; date:string; properties:{name:string}|null };
type Property = { id:string; name:string };
type Lease = { id:string; properties:{name:string}|null; tenants:{first_name:string;last_name:string}|null };
const CATS = ['Maintenance','Réparation','Électricité','Eau','Assurance','Taxes','Fournitures','Transport','Salaires','Autre'];

export default function ExpensesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const { page, pageSize, offset, setPage } = usePagination(20);
  const [form, setForm] = useState({ type:'bailleur' as 'bailleur'|'entreprise', category:'', amount:'', description:'', date:new Date().toISOString().split('T')[0], property_id:'', lease_id:'' });

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('expenses')
      .select('id,type,category,amount,description,date,properties(name)', { count:'exact' })
      .eq('company_id', company.id).order('date', { ascending:false }).range(offset, offset+pageSize-1);
    if (filterType) q = q.eq('type', filterType);
    q.then(({ data, count }) => { setItems((data||[]) as unknown as Expense[]); setTotal(count||0); setLoading(false); });
  };

  useEffect(() => { load(); }, [company?.id, filterType, offset, pageSize]);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('properties').select('id,name').eq('company_id', company.id).order('name').then(({ data }) => setProperties((data||[]) as Property[]));
    sb.from('leases').select('id,properties(name),tenants(first_name,last_name)').eq('company_id', company.id).eq('status','active').then(({ data }) => setLeases((data||[]) as unknown as Lease[]));
  }, [company?.id]);

  const save = async () => {
    if (!form.amount || !form.date) { toast.error('Montant et date requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('expenses').insert({
      company_id: company!.id, type: form.type, category: form.category||null,
      amount: parseFloat(form.amount), description: form.description||null, date: form.date,
      property_id: form.property_id||null, lease_id: form.lease_id||null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Dépense enregistrée');
    setShowModal(false);
    setForm({ type:'bailleur', category:'', amount:'', description:'', date:new Date().toISOString().split('T')[0], property_id:'', lease_id:'' });
    load();
  };

  const remove = async (id: string) => {
    await createClient().from('expenses').delete().eq('id', id);
    toast.success('Dépense supprimée'); load();
  };

  const totalBailleur = items.filter(i => i.type==='bailleur').reduce((s,i) => s+i.amount, 0);
  const totalEntreprise = items.filter(i => i.type==='entreprise').reduce((s,i) => s+i.amount, 0);

  return (
    <div>
      <PageHeader title="Dépenses" subtitle={`${total} dépense(s)`}
        actions={<button onClick={() => setShowModal(true)} className={btnPrimary}><Plus size={16}/> Nouvelle dépense</button>}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Total dépenses</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalBailleur+totalEntreprise)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Dépenses bailleur</p>
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalBailleur)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Dépenses entreprise</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalEntreprise)}</p>
        </div>
      </div>
      <div className="flex gap-3 mb-5">
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={selectCls+' w-44'}>
          <option value="">Tous les types</option>
          <option value="bailleur">Bailleur</option>
          <option value="entreprise">Entreprise</option>
        </select>
      </div>
      {loading ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
        : items.length===0 ? <EmptyState icon={<Receipt size={24}/>} title="Aucune dépense" action={<button onClick={() => setShowModal(true)} className={btnPrimary}><Plus size={16}/>Ajouter</button>}/>
        : (
          <div className={cardCls}>
            <div className="hidden md:grid grid-cols-[1fr_120px_140px_100px_100px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Description</span><span>Catégorie</span><span>Type</span><span>Date</span><span className="text-right">Montant</span>
            </div>
            <div className="divide-y divide-border">
              {items.map(e => (
                <div key={e.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_100px_100px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground">{e.description||'—'}</p>
                    <p className="text-xs text-muted-foreground">{e.properties?.name||'Général'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{e.category||'—'}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${e.type==='bailleur'?'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {e.type==='bailleur'?<Building2 size={10}/>:<Briefcase size={10}/>}
                    {e.type==='bailleur'?'Bailleur':'Entreprise'}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-bold text-red-600">-{formatCurrency(e.amount)}</span>
                    <button onClick={() => remove(e.id)} className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
          </div>
        )
      }
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cardCls+' w-full max-w-lg max-h-[90vh] overflow-y-auto'}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2"><Receipt size={18} className="text-primary"/><h3 className="font-semibold text-foreground">Nouvelle dépense</h3></div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Type de dépense *</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {(['bailleur','entreprise'] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({...f, type:t}))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${form.type===t?'border-primary bg-blue-50 dark:bg-blue-900/20':'border-border hover:border-primary/40'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {t==='bailleur'?<Building2 size={14} className="text-orange-500"/>:<Briefcase size={14} className="text-blue-500"/>}
                        <span className="text-sm font-semibold text-foreground">{t==='bailleur'?'Bailleur':'Entreprise'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t==='bailleur'?'Charge du propriétaire':'Charge interne de gestion'}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Montant (FCFA) *</label><input type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="0" className={inputCls}/></div>
                <div><label className={labelCls}>Date *</label><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} className={inputCls}/></div>
              </div>
              <div><label className={labelCls}>Catégorie</label>
                <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} className={selectCls+' w-full'}>
                  <option value="">— Choisir —</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Description</label><input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Réparation fuite tuyau" className={inputCls}/></div>
              {form.type==='bailleur' && (
                <>
                  <div><label className={labelCls}>Bien immobilier</label>
                    <select value={form.property_id} onChange={e => setForm(f=>({...f,property_id:e.target.value,lease_id:''}))} className={selectCls+' w-full'}>
                      <option value="">— Général —</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Bail / Locataire</label>
                    <select value={form.lease_id} onChange={e => setForm(f=>({...f,lease_id:e.target.value}))} className={selectCls+' w-full'}>
                      <option value="">— Aucun bail spécifique —</option>
                      {leases.map(l => <option key={l.id} value={l.id}>{l.tenants?.first_name} {l.tenants?.last_name} — {l.properties?.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-700/20 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className={btnSecondary}>Annuler</button>
              <button onClick={save} disabled={saving} className={btnPrimary}>
                {saving ? <LoadingSpinner size={15}/> : <Plus size={15}/>}{saving?'Enregistrement...':'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}