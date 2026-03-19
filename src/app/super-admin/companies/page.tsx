'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, Search, Filter, ToggleLeft, ToggleRight, Edit, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, inputCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { usePagination, useSearch } from '@/lib/hooks';
import { toast } from 'sonner';

type Company = { id:string; name:string; email:string|null; phone:string|null; plan:string; is_active:boolean; created_at:string; modules:string[] };

const PLAN_CFG: Record<string,{label:string;color:string}> = {
  free:       { label:'Free',       color:'bg-slate-100 text-slate-600' },
  starter:    { label:'Starter',    color:'bg-blue-100 text-blue-700' },
  pro:        { label:'Pro',        color:'bg-purple-100 text-purple-700' },
  enterprise: { label:'Enterprise', color:'bg-amber-100 text-amber-700' },
};

export default function SuperAdminCompanies() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [togglingId, setTogglingId] = useState<string|null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company|null>(null);
  const [deleting, setDeleting] = useState(false);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(15);

  const [pendingItems, setPendingItems] = useState<Company[]>([]);

  const loadPending = () => {
    createClient().from('companies').select('id,name,email,phone,plan,is_active,created_at,modules')
      .eq('is_active', false).order('created_at', { ascending:false })
      .then(({ data }) => setPendingItems((data||[]) as Company[]));
  };

  const approveCompany = async (c: Company) => {
    await createClient().from('companies').update({ is_active:true } as never).eq('id', c.id);
    // Also activate the admin user of this company
    await createClient().from('users').update({ is_active:true } as never).eq('company_id', c.id).eq('role','admin');
    setPendingItems(prev => prev.filter(x => x.id !== c.id));
    load();
    toast.success(c.name+' approuvee !');
  };

  const rejectCompany = async (c: Company) => {
    await createClient().from('companies').delete().eq('id', c.id);
    setPendingItems(prev => prev.filter(x => x.id !== c.id));
    toast.success('Demande refusee');
  };

  const load = () => {
    if (user?.role !== 'super_admin') return;
    setLoading(true);
    let q = createClient().from('companies')
      .select('id,name,email,phone,plan,is_active,created_at,modules', { count:'exact' })
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (filterPlan) q = q.eq('plan', filterPlan);
    if (filterStatus==='active') q = q.eq('is_active', true);
    if (filterStatus==='inactive') q = q.eq('is_active', false);
    if (debounced) q = q.ilike('name', '%'+debounced+'%');
    q.then(({ data, count }) => { setItems((data||[]) as Company[]); setTotal(count||0); setLoading(false); });
  };

  useEffect(() => { load(); loadPending(); }, [user?.role, debounced, filterPlan, filterStatus, offset, pageSize]);

  const toggleStatus = async (c: Company) => {
    setTogglingId(c.id);
    const sb2 = createClient();
    await sb2.from('companies').update({ is_active:!c.is_active } as never).eq('id', c.id);
    // Sync all users of this company
    await sb2.from('users').update({ is_active:!c.is_active } as never).eq('company_id', c.id);
    setItems(prev => prev.map(co => co.id===c.id ? {...co, is_active:!co.is_active} : co));
    toast.success(c.is_active ? 'Entreprise suspendue' : 'Entreprise activée');
    setTogglingId(null);
  };

  const confirmDelete = async () => {
    if (!deletingCompany) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: deletingCompany.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur suppression');
      toast.success('Entreprise supprimée définitivement');
      setDeletingCompany(null);
      setDeleting(false);
      load();
      return;
    } catch (e: any) {
      toast.error('Erreur: ' + e.message);
    }
    setDeleting(false);
    setDeletingCompany(null);
  };

  if (user?.role !== 'super_admin') return <div className="text-center py-16 text-muted-foreground">Acces refuse</div>;

  return (
    <div>
      <PageHeader title="Entreprises" subtitle={total+' entreprise(s)'}
        actions={<Link href="/super-admin/companies/new" className={btnPrimary}><Plus size={16}/>Creer une entreprise</Link>}/>

      {/* Pending company approvals */}
      {pendingItems.length > 0 && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-3">
            ⏳ Nouvelles entreprises en attente ({pendingItems.length})
          </p>
          <div className="space-y-2">
            {pendingItems.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email||'—'}</p>
                  <div className="flex gap-1 mt-1">
                    {(c.modules||[]).map(m=>(
                      <span key={m} className={'text-[10px] px-2 py-0.5 rounded-full font-semibold '+(m==='real_estate'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700')}>
                        {m==='real_estate'?'Immo':'Logistique'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={()=>approveCompany(c)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
                    Approuver
                  </button>
                  <button onClick={()=>rejectCompany(c)}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-lg transition-colors">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher..." className={inputCls+' pl-9'}/>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground"/>
          <select value={filterPlan} onChange={e=>{setFilterPlan(e.target.value);setPage(1);}} className={selectCls+' w-36'}>
            <option value="">Tous les plans</option>
            {Object.entries(PLAN_CFG).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className={selectCls+' w-36'}>
            <option value="">Tous statuts</option>
            <option value="active">Actives</option>
            <option value="inactive">Suspendues</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
        : items.length===0
          ? <EmptyState icon={<Building2 size={24}/>} title="Aucune entreprise"
              action={<Link href="/super-admin/companies/new" className={btnPrimary}><Plus size={16}/>Creer</Link>}/>
          : (
            <div className={cardCls}>
              <div className="hidden md:grid grid-cols-[1fr_140px_100px_100px_120px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Entreprise</span><span>Plan</span><span>Modules</span><span>Statut</span><span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-border">
                {items.map(c => {
                  const plan = PLAN_CFG[c.plan]||PLAN_CFG.starter;
                  return (
                    <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px_100px_120px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email||'—'}{c.phone?' · '+c.phone:''}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                      </div>
                      <span className={'inline-flex text-xs font-semibold px-2.5 py-1 rounded-full w-fit '+plan.color}>{plan.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {(c.modules||[]).slice(0,2).map(m=>(
                          <span key={m} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-muted-foreground px-1.5 py-0.5 rounded">
                            {m==='real_estate'?'Immo':m==='logistics'?'Logi':m}
                          </span>
                        ))}
                      </div>
                      <Badge variant={c.is_active?'success':'default'}>{c.is_active?'Active':'Suspendue'}</Badge>
                      <div className="flex items-center gap-1 md:justify-end">
                        {/* Voir */}
                        <Link href={'/super-admin/companies/'+c.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Voir">
                          <Eye size={15}/>
                        </Link>
                        {/* Modifier */}
                        <Link href={'/super-admin/companies/'+c.id+'/edit'}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Modifier">
                          <Edit size={15}/>
                        </Link>
                        {/* Suspendre / Activer */}
                        <button onClick={()=>toggleStatus(c)} disabled={togglingId===c.id}
                          className={'p-1.5 rounded-lg transition-colors '+(c.is_active?'text-amber-500 hover:bg-amber-50':'text-green-600 hover:bg-green-50')}
                          title={c.is_active?'Suspendre':'Activer'}>
                          {togglingId===c.id ? <LoadingSpinner size={14}/> : c.is_active ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
                        </button>
                        {/* Supprimer */}
                        <button onClick={()=>setDeletingCompany(c)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Supprimer">
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
            </div>
          )}

      {/* ── CONFIRM DELETE ──────────────────────────────────── */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cardCls+' p-6 w-full max-w-sm'}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600"/>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Supprimer l'entreprise ?</h3>
                <p className="text-sm text-muted-foreground">Tous les utilisateurs et donnees seront supprimes</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 mb-5">
              <p className="font-semibold text-sm text-foreground">{deletingCompany.name}</p>
              <p className="text-xs text-muted-foreground">{deletingCompany.email||'—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Plan : {PLAN_CFG[deletingCompany.plan]?.label}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setDeletingCompany(null)} className={btnSecondary}>Annuler</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
                {deleting ? <LoadingSpinner size={15}/> : <Trash2 size={15}/>}
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}