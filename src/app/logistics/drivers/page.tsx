'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Phone, Mail, Star, Truck, CheckCircle, Clock, XCircle, Edit, Trash2, UserPlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { getInitials, formatDate } from '@/lib/utils';
import { useSearch, usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Driver = { id:string; first_name:string; last_name:string; phone:string; email:string|null; status:string; rating:number; total_deliveries:number; successful_deliveries:number; license_expiry:string|null; created_at:string };

const STATUS_MAP: Record<string,{l:string;v:BadgeVariant;color:string}> = {
  available:   { l:'Disponible',   v:'success', color:'text-green-600' },
  on_mission:  { l:'En mission',   v:'info',    color:'text-blue-600' },
  off:         { l:'Hors service', v:'default', color:'text-slate-500' },
  inactive:    { l:'Inactif',      v:'default', color:'text-slate-400' },
};

export default function DriversPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountDriver, setAccountDriver] = useState<Driver|null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const { query, setQuery, debounced } = useSearch();
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('drivers')
      .select('id,first_name,last_name,phone,email,status,rating,total_deliveries,successful_deliveries,license_expiry,created_at', { count:'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending:false })
      .range(offset, offset+pageSize-1);
    if (filterStatus) q = q.eq('status', filterStatus);
    if (debounced) q = q.or(`first_name.ilike.%${debounced}%,last_name.ilike.%${debounced}%,phone.ilike.%${debounced}%`);
    q.then(
      ({ data, count }) => { setItems((data||[]) as Driver[]); setTotal(count||0); setLoading(false); },
      (err: any) => { console.error('Erreur chauffeurs:', err); toast.error('Erreur: ' + (err?.message || 'requête échouée')); setLoading(false); }
    );
  };

  useEffect(load, [company?.id, filterStatus, debounced, offset, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('drivers').delete().eq('id', deleteId);
    toast.success('Chauffeur supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const available = items.filter(d=>d.status==='available').length;

  const handleCreateAccount = async () => {
    if (!accountDriver || !accountEmail || !accountPassword) { toast.error('Email et mot de passe requis'); return; }
    setSavingAccount(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountEmail,
          password: accountPassword,
          full_name: `${accountDriver.first_name} ${accountDriver.last_name}`,
          role: 'driver',
          company_id: company?.id,
          driver_id: accountDriver.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'Erreur création compte'); setSavingAccount(false); return; }
      toast.success('Compte chauffeur créé ✓');
      setCreatingAccount(false); setAccountDriver(null); setAccountEmail(''); setAccountPassword('');
      load();
    } catch(e) { toast.error('Erreur réseau'); }
    setSavingAccount(false);
  };

  return (
    <div>
      <PageHeader title="Chauffeurs" subtitle={`${total} chauffeur(s) · ${available} disponible(s)`}
        actions={<Link href="/logistics/drivers/new" className={btnPrimary}><Plus size={16}/> Ajouter chauffeur</Link>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nom, téléphone..." className={inputCls+' pl-9'}/>
        </div>
        <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} className={selectCls+' w-40'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32}/></div>
        : items.length===0 ? <EmptyState icon={<Truck size={24}/>} title="Aucun chauffeur" action={<Link href="/logistics/drivers/new" className={btnPrimary}><Plus size={16}/>Ajouter</Link>}/>
        : (
          <div className={cardCls}>
            <div className="divide-y divide-border">
              {items.map(d => {
                const sm = STATUS_MAP[d.status]||{l:d.status,v:'default' as BadgeVariant,color:'text-slate-500'};
                const successRate = d.total_deliveries > 0 ? Math.round((d.successful_deliveries/d.total_deliveries)*100) : 0;
                const licenseExpiring = d.license_expiry && (new Date(d.license_expiry).getTime()-Date.now())/(1000*60*60*24) <= 30;
                return (
                  <div key={d.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${d.status==='available'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}`}>
                      {getInitials(`${d.first_name} ${d.last_name}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{d.first_name} {d.last_name}</p>
                        {licenseExpiring && <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Permis expire bientôt</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10}/>{d.phone}</span>
                        {d.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10}/>{d.email}</span>}
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Star size={10} className="text-amber-400"/>{d.rating?.toFixed(1)||'5.0'}</span>
                        <span className="text-xs text-muted-foreground">{d.total_deliveries} livraisons · {successRate}% succès</span>
                      </div>
                    </div>
                    <Badge variant={sm.v}>{sm.l}</Badge>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>{ setAccountDriver(d); setAccountEmail(d.email||''); setCreatingAccount(true); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors" title="Créer compte portail">
                        <UserPlus size={14}/>
                      </button>
                      <Link href={`/logistics/drivers/${d.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors"><Edit size={14}/></Link>
                      <button onClick={()=>setDeleteId(d.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
          </div>
        )}

      {/* Modal créer compte chauffeur */}
      {creatingAccount && accountDriver && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground">Créer compte chauffeur</h3>
                <p className="text-sm text-muted-foreground">{accountDriver.first_name} {accountDriver.last_name}</p>
              </div>
              <button onClick={()=>setCreatingAccount(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Email *</label>
                <input type="email" value={accountEmail} onChange={e=>setAccountEmail(e.target.value)}
                  placeholder="chauffeur@email.com" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Mot de passe *</label>
                <input type="password" value={accountPassword} onChange={e=>setAccountPassword(e.target.value)}
                  placeholder="Minimum 6 caractères" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              </div>
              <p className="text-xs text-muted-foreground">Le chauffeur pourra se connecter sur <strong>nexora-sage-nine.vercel.app/driver</strong></p>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setCreatingAccount(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50">Annuler</button>
                <button onClick={handleCreateAccount} disabled={savingAccount||!accountEmail||!accountPassword}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingAccount?<LoadingSpinner size={14}/>:<UserPlus size={14}/>}
                  {savingAccount?'Création...':'Créer le compte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="Supprimer ce chauffeur ?" description="Action irréversible."
        confirmLabel={deleting?'Suppression...':'Supprimer'} onConfirm={handleDelete} onCancel={()=>setDeleteId(null)}/>
    </div>
  );
}