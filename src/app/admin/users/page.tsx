'use client';
import { useEffect, useState } from 'react';
import { Users, Search, Filter, Edit, ToggleLeft, ToggleRight, UserPlus, Trash2, X, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, AppUser, UserRole } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';
import { usePagination, useSearch } from '@/lib/hooks';
import { toast } from 'sonner';

type FullUser = AppUser & { companies: { name: string } | null };

const ROLE_MAP: Record<string,{l:string;v:BadgeVariant}> = {
  super_admin: { l:'Super Admin',           v:'error'   },
  admin:       { l:'Admin',                 v:'info'    },
  manager:     { l:'Manager',               v:'info'    },
  agent:       { l:'Agent',                 v:'warning' },
  viewer:      { l:'Viewer',               v:'default' },
  comptable:   { l:'Comptable',             v:'purple'  },
  pdg:         { l:'PDG',                   v:'warning' },
  responsable_operations:    { l:'Resp. opérations',     v:'info'    },
  // Logistique
  manager_logistique:        { l:'Manager Logistique',   v:'info'    },
  caissiere:                 { l:'Caissière',             v:'warning' },
  responsable_vente:         { l:'Resp. vente',           v:'info'    },
  assistante_admin:          { l:'Assistante admin',      v:'default' },
  // Béton
  manager_beton:             { l:'Manager Béton',         v:'info'    },
  responsable_production:    { l:'Resp. production',      v:'warning' },
  operateur_centrale:        { l:'Opérateur centrale',    v:'default' },
  assistante_commerciale:    { l:'Assistante commerciale',v:'default' },
  responsable_qualite:       { l:'Resp. qualité',         v:'warning' },
  tenant:      { l:'Locataire',   v:'default' },
};

const ROLE_DESC: Record<string,string> = {
  admin:                  'Accès complet à son entreprise',
  manager:                'Gestion opérationnelle',
  agent:                  'Paiements et maintenance',
  viewer:                 'Lecture seule',
  comptable:              'Gestion financière et comptabilité',
  pdg:                    'Vision exécutive en lecture seule',
  responsable_operations: 'Suivi opérationnel en lecture seule',
  // Logistique
  manager_logistique:     'Gestion complète du module logistique',
  caissiere:              'Gestion de la caisse et paiements',
  responsable_vente:      'Suivi des commandes et clients',
  assistante_admin:       'Support administratif logistique',
  // Béton
  manager_beton:          'Gestion complète du module béton',
  responsable_production: 'Suivi de la production',
  operateur_centrale:     'Opérations de la centrale',
  assistante_commerciale: 'Support commercial béton',
  responsable_qualite:    'Contrôle qualité production',
};

const ROLES_BY_MODULE: Record<string, UserRole[]> = {
  real_estate: ['admin','manager','agent','viewer','comptable','responsable_operations'],
  logistics:   ['manager_logistique','caissiere','responsable_vente','assistante_admin'],
  beton:       ['manager_beton','responsable_production','operateur_centrale','assistante_commerciale','responsable_qualite'],
};

function getRolesForCompany(modules: string[]): UserRole[] {
  const roles: UserRole[] = ['admin'];
  for (const mod of modules) {
    if (ROLES_BY_MODULE[mod]) roles.push(...ROLES_BY_MODULE[mod]);
  }
  if (!modules.length) roles.push('manager','agent','viewer','comptable','responsable_operations');
  return roles;
}

export default function SuperAdminUsersPage() {
  const { user, company } = useAuthStore();
  const [items, setItems] = useState<FullUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingUser, setEditingUser] = useState<FullUser|null>(null);
  const [editRole, setEditRole] = useState<UserRole>('agent');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string|null>(null);
  const [deletingUser, setDeletingUser] = useState<FullUser|null>(null);
  const [deleting, setDeleting] = useState(false);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(20);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ full_name:'', email:'', password:'', role:'admin' as UserRole });

  const isAdmin = user?.role === 'admin';

  const load = () => {
    if (!isAdmin || !company?.id) return;
    setLoading(true);
    let q = createClient().from('users')
      .select('*,companies(name)', { count:'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (filterRole)                q = q.eq('role', filterRole);
    if (filterStatus==='active')   q = q.eq('is_active', true);
    if (filterStatus==='inactive') q = q.eq('is_active', false);
    if (debounced) q = q.or(`full_name.ilike.%${debounced}%,email.ilike.%${debounced}%`);
    q.then(({ data, count }) => { setItems((data||[]) as FullUser[]); setTotal(count||0); setLoading(false); });
  };

  useEffect(() => { load(); }, [user?.role, company?.id, debounced, filterRole, filterStatus, offset, pageSize]);

  const upsertListItem = (updatedUser?: FullUser | null) => {
    if (!updatedUser) return;
    setItems((prev) => {
      const exists = prev.some((item) => item.id === updatedUser.id);
      if (!exists) return [updatedUser, ...prev].slice(0, pageSize);
      return prev.map((item) => item.id === updatedUser.id ? updatedUser : item);
    });
  };

  const approveTenant = async (u: FullUser) => {
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, is_active: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur activation');
      upsertListItem((json.user || null) as FullUser | null);
      toast.success(u.full_name+' approuve !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur activation');
    }
  };

  const toggleActive = async (u: FullUser) => {
    setTogglingId(u.id);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, is_active: !u.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur mise a jour');
      upsertListItem((json.user || null) as FullUser | null);
      toast.success(u.is_active ? 'Utilisateur desactive' : 'Utilisateur active');
    } catch (e: any) {
      toast.error(e.message || 'Erreur mise a jour');
    }
    setTogglingId(null);
  };

  const saveRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id, role: editRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur role');
      upsertListItem((json.user || null) as FullUser | null);
      toast.success('Role mis a jour');
    } catch (e: any) {
      toast.error(e.message || 'Erreur role');
    }
    setSaving(false);
    setEditingUser(null);
  };

  // Supprime dans public.users ET auth.users via API route
  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deletingUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur suppression');
      setItems(prev => prev.filter(x => x.id !== deletingUser.id));
      setTotal(t => t - 1);
      toast.success('Utilisateur supprime definitivement');
    } catch (e: any) {
      toast.error('Erreur: ' + e.message);
    }
    setDeleting(false);
    setDeletingUser(null);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) { toast.error('Nom, email et mot de passe sont requis'); return; }
    if (newUser.password.length < 6) { toast.error('Mot de passe minimum 6 caracteres'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
          company_id: company?.id || null,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Erreur creation'); setCreating(false); return; }
      toast.success('Compte cree !');
      if (json.user) {
        upsertListItem(json.user as FullUser);
        setTotal((t) => t + 1);
      } else {
        load();
      }
      setShowCreate(false);
      setNewUser({ full_name:'', email:'', password:'', role:'admin' });
    } catch (e: any) { toast.error(e.message || 'Erreur'); }
    setCreating(false);
  };

  if (!isAdmin) return <div className="text-center py-16 text-muted-foreground">Acces refuse</div>;

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle={total+' utilisateur(s)'}
        actions={
          <button onClick={() => setShowCreate(true)} className={btnPrimary}>
            <UserPlus size={16}/> Creer un utilisateur
          </button>
        }
      />

      {/* Pending tenant approvals */}
      {items.filter(u=>u.role==='tenant'&&!u.is_active).length > 0 && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-3">
            ⏳ Demandes en attente ({items.filter(u=>u.role==='tenant'&&!u.is_active).length})
          </p>
          <div className="space-y-2">
            {items.filter(u=>u.role==='tenant'&&!u.is_active).map(u=>(
              <div key={u.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.full_name||'—'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>approveTenant(u)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
                    Approuver
                  </button>
                  <button onClick={()=>setDeletingUser(u)}
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
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nom, email..." className={inputCls+' pl-9'}/>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground"/>
          <select value={filterRole} onChange={e=>{setFilterRole(e.target.value);setPage(1);}} className={selectCls+' w-36'}>
            <option value="">Tous les roles</option>
            {Object.entries(ROLE_MAP).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className={selectCls+' w-32'}>
            <option value="">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading
        ? <div className="flex items-center justify-center h-48"><LoadingSpinner size={32}/></div>
        : items.length===0
          ? <EmptyState icon={<Users size={24}/>} title="Aucun utilisateur"
              action={<button onClick={()=>setShowCreate(true)} className={btnPrimary}><UserPlus size={16}/>Creer un utilisateur</button>}/>
          : (
            <div className={cardCls}>
              <div className="hidden md:grid grid-cols-[1fr_160px_120px_100px_120px] gap-3 px-5 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Utilisateur</span><span>Entreprise</span><span>Role</span><span>Statut</span><span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-border">
                {items.map(u => {
                  const rm = ROLE_MAP[u.role]||{l:u.role,v:'default' as BadgeVariant};
                  const isSelf = u.id === user?.id;
                  return (
                    <div key={u.id} className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px_100px_120px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                          {getInitials(u.full_name||u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{u.full_name||'—'} {isSelf && <span className="text-xs text-muted-foreground">(vous)</span>}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(u.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{(u as any).companies?.name||'—'}</span>
                      <Badge variant={rm.v}>{rm.l}</Badge>
                      <Badge variant={u.is_active?'success':'default'}>{u.is_active?'Actif':'Inactif'}</Badge>
                      <div className="flex items-center gap-1 md:justify-end">
                        <button onClick={()=>{ setEditingUser(u); setEditRole(u.role); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Modifier role">
                          <Edit size={15}/>
                        </button>
                        <button onClick={()=>toggleActive(u)} disabled={togglingId===u.id || isSelf}
                          className={'p-1.5 rounded-lg transition-colors '+(isSelf?'opacity-30 cursor-not-allowed':u.is_active?'text-amber-500 hover:bg-amber-50':'text-green-600 hover:bg-green-50')}
                          title={isSelf?'Impossible':u.is_active?'Desactiver':'Activer'}>
                          {togglingId===u.id ? <LoadingSpinner size={14}/> : u.is_active ? <ToggleRight size={15}/> : <ToggleLeft size={15}/>}
                        </button>
                        <button onClick={()=>!isSelf && setDeletingUser(u)} disabled={isSelf}
                          className={'p-1.5 rounded-lg transition-colors '+(isSelf?'opacity-30 cursor-not-allowed':'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20')}
                          title={isSelf?'Impossible':'Supprimer'}>
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

      {/* MODAL CREER */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cardCls+' w-full max-w-md'}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-primary"/>
                <h3 className="font-semibold text-foreground">Creer un utilisateur</h3>
              </div>
              <button onClick={()=>setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelCls}>Nom complet *</label>
                <input value={newUser.full_name} onChange={e=>setNewUser(f=>({...f,full_name:e.target.value}))} placeholder="Ex: Abdou Diallo" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={newUser.email} onChange={e=>setNewUser(f=>({...f,email:e.target.value}))} placeholder="email@exemple.com" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Mot de passe *</label>
                <input type="password" value={newUser.password} onChange={e=>setNewUser(f=>({...f,password:e.target.value}))} placeholder="Minimum 6 caracteres" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Role *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {getRolesForCompany(company?.modules || []).map(r => {
                    const rm = ROLE_MAP[r];
                    return (
                      <button key={r} onClick={()=>setNewUser(f=>({...f,role:r}))}
                        className={'p-3 rounded-xl border-2 text-left transition-all '+(newUser.role===r?'border-primary bg-blue-50 dark:bg-blue-900/20':'border-border hover:border-primary/40')}>
                        <div className="flex items-center gap-2 mb-0.5"><Badge variant={rm.v}>{rm.l}</Badge></div>
                        <p className="text-xs text-muted-foreground">{ROLE_DESC[r]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>Entreprise</label>
                <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm text-foreground font-medium">
                  {company?.name || '—'}
                  <span className="text-xs text-muted-foreground ml-2">(auto-assignée)</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-700/20 rounded-b-2xl">
              <button onClick={()=>setShowCreate(false)} className={btnSecondary}>Annuler</button>
              <button onClick={handleCreateUser} disabled={creating} className={btnPrimary}>
                {creating ? <LoadingSpinner size={15}/> : <UserPlus size={15}/>}
                {creating ? 'Creation...' : 'Creer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER ROLE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={cardCls+' p-6 w-full max-w-sm'}>
            <h3 className="font-semibold text-foreground mb-1">Modifier le role</h3>
            <p className="text-sm text-muted-foreground mb-4">{editingUser.full_name||editingUser.email}</p>
            <div className="space-y-2 mb-5">
              {getRolesForCompany(company?.modules || []).map(r => {
                const rm = ROLE_MAP[r];
                return (
                  <label key={r} className={'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all '+(editRole===r?'border-primary bg-blue-50 dark:bg-blue-900/20':'border-border hover:border-primary/40')}>
                    <input type="radio" name="role" value={r} checked={editRole===r} onChange={()=>setEditRole(r)} className="accent-primary"/>
                    <div className="flex-1"><p className="text-sm font-medium text-foreground">{rm.l}</p><p className="text-xs text-muted-foreground">{ROLE_DESC[r]}</p></div>
                    <Badge variant={rm.v}>{rm.l}</Badge>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setEditingUser(null)} className={btnSecondary}>Annuler</button>
              <button onClick={saveRole} disabled={saving} className={btnPrimary}>
                {saving ? <LoadingSpinner size={15}/> : null} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cardCls+' p-6 w-full max-w-sm'}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600"/>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Supprimer l&apos;utilisateur ?</h3>
                <p className="text-sm text-muted-foreground">Suppression definitive de la base de donnees</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 mb-5">
              <p className="font-medium text-sm text-foreground">{deletingUser.full_name||'—'}</p>
              <p className="text-xs text-muted-foreground">{deletingUser.email}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setDeletingUser(null)} className={btnSecondary}>Annuler</button>
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
