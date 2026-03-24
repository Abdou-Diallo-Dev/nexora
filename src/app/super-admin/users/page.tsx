'use client';
import { useEffect, useState } from 'react';
import { Users, Search, Filter, Edit, ToggleLeft, ToggleRight, UserPlus, Trash2, X, AlertTriangle, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, AppUser, UserRole } from '@/lib/store';
import { PageHeader, Badge, LoadingSpinner, EmptyState, Pagination, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls, BadgeVariant } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';
import { usePagination, useSearch } from '@/lib/hooks';
import { toast } from 'sonner';

type FullUser = AppUser & { companies: { name: string } | null };
type Company  = { id: string; name: string };

const ROLE_MAP: Record<string,{l:string;v:BadgeVariant}> = {
  super_admin: { l:'Super Admin', v:'error'   },
  admin:       { l:'Admin',       v:'info'    },
  manager:     { l:'Manager',     v:'info'    },
  agent:       { l:'Agent',       v:'warning' },
  viewer:      { l:'Viewer',      v:'default' },
  comptable:   { l:'Comptable',   v:'purple'  },
  pdg:         { l:'PDG',         v:'warning' },
  responsable_operations: { l:'Resp. operations', v:'info' },
  tenant:      { l:'Locataire',   v:'default' },
};

const ROLES: UserRole[] = ['admin','manager','agent','viewer','comptable','pdg','responsable_operations'];
const ROLES_WITH_SA: UserRole[] = ['super_admin','admin','manager','agent','viewer','comptable','pdg','responsable_operations'];

const ROLE_DESC: Record<string,string> = {
  admin:     'Acces complet a son entreprise',
  manager:   'Gestion operationnelle',
  agent:     'Paiements et maintenance',
  viewer:    'Lecture seule',
  comptable: 'Gestion financiere et comptabilite',
  pdg:       'Vision executive en lecture seule',
  responsable_operations: 'Suivi operationnel en lecture seule',
};

export default function SuperAdminUsersPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<FullUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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

  // Password change modal
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ newPwd:'', confirm:'' });
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  // Promote to super_admin
  const [promotingUser, setPromotingUser] = useState<FullUser|null>(null);
  const [promoting, setPromoting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ full_name:'', email:'', password:'', role:'agent' as UserRole, company_id:'' });

  const isSA = user?.role === 'super_admin';

  const load = () => {
    if (!isSA) return;
    setLoading(true);
    let q = createClient().from('users')
      .select('*,companies(name)', { count:'exact' })
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (filterRole)                q = q.eq('role', filterRole);
    if (filterStatus==='active')   q = q.eq('is_active', true);
    if (filterStatus==='inactive') q = q.eq('is_active', false);
    if (debounced) q = q.or(`full_name.ilike.%${debounced}%,email.ilike.%${debounced}%`);
    q.then(({ data, count }) => { setItems((data||[]) as FullUser[]); setTotal(count||0); setLoading(false); });
  };

  useEffect(() => { load(); }, [user?.role, debounced, filterRole, filterStatus, offset, pageSize]);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    createClient().from('companies').select('id,name').eq('is_active', true).order('name')
      .then(({ data }) => setCompanies((data||[]) as Company[]));
  }, [user?.role]);

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
      toast.success('Utilisateur supprimé définitivement');
      setDeletingUser(null);
      setDeleting(false);
      load();
      return;
    } catch (e: any) {
      toast.error('Erreur: ' + e.message);
    }
    setDeleting(false);
    setDeletingUser(null);
  };

  const changePassword = async () => {
    if (pwdForm.newPwd.length < 8) { toast.error('Minimum 8 caractères'); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setSavingPwd(true);
    const { error } = await createClient().auth.updateUser({ password: pwdForm.newPwd });
    setSavingPwd(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Mot de passe modifié !');
    setShowPwdModal(false);
    setPwdForm({ newPwd:'', confirm:'' });
  };

  const promoteToSuperAdmin = async () => {
    if (!promotingUser) return;
    setPromoting(true);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: promotingUser.id, role: 'super_admin' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur promotion');
      upsertListItem((json.user || null) as FullUser | null);
      toast.success(promotingUser.full_name + ' est maintenant Super Admin !');
    } catch (e: any) {
      toast.error(e.message || 'Erreur promotion');
    }
    setPromotingUser(null);
    setPromoting(false);
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
          email:      newUser.email,
          password:   newUser.password,
          full_name:  newUser.full_name,
          role:       newUser.role,
          company_id: newUser.company_id || null,
          is_active:  true,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Erreur création'); setCreating(false); return; }
      toast.success('Compte créé avec succès !');
      if (json.user) {
        upsertListItem(json.user as FullUser);
        setTotal((t) => t + 1);
      }
      setShowCreate(false);
      setNewUser({ full_name:'', email:'', password:'', role:'agent', company_id:'' });
      load();
    } catch (e: any) { toast.error(e.message || 'Erreur'); }
    setCreating(false);
  };

  if (!isSA) return <div className="text-center py-16 text-muted-foreground">Acces refuse</div>;

  return (
    <div>
      <PageHeader title="Utilisateurs" subtitle={total+' utilisateur(s)'}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowPwdModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors">
              <Lock size={15}/> Mon mot de passe
            </button>
            <button onClick={() => setShowCreate(true)} className={btnPrimary}>
              <UserPlus size={16}/> Creer un utilisateur
            </button>
          </div>
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
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nom, email..." className={inputCls+' pl-9 w-full'}/>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground flex-shrink-0"/>
          <select value={filterRole} onChange={e=>{setFilterRole(e.target.value);setPage(1);}} className={selectCls+' flex-1'}>
            <option value="">Tous les roles</option>
            {Object.entries(ROLE_MAP).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className={selectCls+' flex-1'}>
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
                    <div key={u.id} className="px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      {/* Mobile layout */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                          {getInitials(u.full_name||u.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm text-foreground truncate">
                              {u.full_name||'—'} {isSelf && <span className="text-xs text-muted-foreground">(vous)</span>}
                            </p>
                            {/* Actions */}
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button onClick={()=>{ setEditingUser(u); setEditRole(u.role); }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Modifier rôle">
                                <Edit size={14}/>
                              </button>
                              {!isSelf && u.role !== 'super_admin' && (
                                <button onClick={()=>setPromotingUser(u)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-600 hover:bg-yellow-50 transition-colors" title="Nommer Super Admin">
                                  <ShieldCheck size={14}/>
                                </button>
                              )}
                              <button onClick={()=>toggleActive(u)} disabled={togglingId===u.id || isSelf}
                                className={'p-1.5 rounded-lg transition-colors '+(isSelf?'opacity-30 cursor-not-allowed':u.is_active?'text-amber-500 hover:bg-amber-50':'text-green-600 hover:bg-green-50')}
                                title={isSelf?'Impossible':u.is_active?'Désactiver':'Activer'}>
                                {togglingId===u.id ? <LoadingSpinner size={13}/> : u.is_active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                              </button>
                              <button onClick={()=>!isSelf && setDeletingUser(u)} disabled={isSelf}
                                className={'p-1.5 rounded-lg transition-colors '+(isSelf?'opacity-30 cursor-not-allowed':'text-red-400 hover:text-red-600 hover:bg-red-50')}
                                title={isSelf?'Impossible':'Supprimer'}>
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          <p className="text-xs text-muted-foreground">{(u as any).companies?.name||'—'} · {formatDate(u.created_at)}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant={rm.v}>{rm.l}</Badge>
                            <Badge variant={u.is_active?'success':'default'}>{u.is_active?'Actif':'Inactif'}</Badge>
                          </div>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className={cardCls+' w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col'}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-primary"/>
                <h3 className="font-semibold text-foreground">Créer un utilisateur</h3>
              </div>
              <button onClick={()=>setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">
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
                <input type="password" value={newUser.password} onChange={e=>setNewUser(f=>({...f,password:e.target.value}))} placeholder="Minimum 6 caractères" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Rôle *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {ROLES.map(r => {
                    const rm = ROLE_MAP[r];
                    return (
                      <button key={r} onClick={()=>setNewUser(f=>({...f,role:r}))}
                        className={'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all '+(newUser.role===r?'border-primary bg-blue-50 dark:bg-blue-900/20':'border-border hover:border-primary/40')}>
                        <Badge variant={rm.v}>{rm.l}</Badge>
                        <p className="text-xs text-muted-foreground">{ROLE_DESC[r]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>Entreprise</label>
                <select value={newUser.company_id} onChange={e=>setNewUser(f=>({...f,company_id:e.target.value}))} className={selectCls+' w-full'}>
                  <option value="">-- Choisir une entreprise --</option>
                  {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-4 sm:px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-700/20 rounded-b-2xl flex-shrink-0">
              <button onClick={()=>setShowCreate(false)} className={btnSecondary}>Annuler</button>
              <button onClick={handleCreateUser} disabled={creating} className={btnPrimary}>
                {creating ? <LoadingSpinner size={15}/> : <UserPlus size={15}/>}
                {creating ? 'Création...' : 'Créer le compte'}
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
              {ROLES.map(r => {
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

      {/* MODAL MOT DE PASSE */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cardCls+' p-6 w-full max-w-sm'}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-primary"/>
                <h3 className="font-semibold text-foreground">Changer mon mot de passe</h3>
              </div>
              <button onClick={()=>setShowPwdModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Nouveau mot de passe</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={pwdForm.newPwd}
                    onChange={e=>setPwdForm(f=>({...f,newPwd:e.target.value}))}
                    placeholder="Minimum 8 caractères" className={inputCls+' pr-9'}/>
                  <button type="button" onClick={()=>setShowPwd(v=>!v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Confirmer</label>
                <input type={showPwd ? 'text' : 'password'} value={pwdForm.confirm}
                  onChange={e=>setPwdForm(f=>({...f,confirm:e.target.value}))}
                  placeholder="Répétez le mot de passe" className={inputCls}/>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={()=>setShowPwdModal(false)} className={btnSecondary}>Annuler</button>
              <button onClick={changePassword} disabled={savingPwd} className={btnPrimary}>
                {savingPwd ? <LoadingSpinner size={15}/> : <Lock size={15}/>} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROMOUVOIR SUPER ADMIN */}
      {promotingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cardCls+' p-6 w-full max-w-sm'}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} className="text-yellow-600"/>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Nommer Super Admin ?</h3>
                <p className="text-sm text-muted-foreground">Cette action donne tous les droits</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 mb-5">
              <p className="font-medium text-sm text-foreground">{promotingUser.full_name||'—'}</p>
              <p className="text-xs text-muted-foreground">{promotingUser.email}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setPromotingUser(null)} className={btnSecondary}>Annuler</button>
              <button onClick={promoteToSuperAdmin} disabled={promoting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold transition-colors">
                {promoting ? <LoadingSpinner size={15}/> : <ShieldCheck size={15}/>}
                {promoting ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
