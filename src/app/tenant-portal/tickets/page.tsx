'use client';
import { useEffect, useState } from 'react';
import { Plus, Wrench, X, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant, inputCls, selectCls, labelCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Ticket = { id:string; title:string; description:string|null; category:string; priority:string; status:string; created_at:string; resolution:string|null; satisfaction:number|null };

const STATUS_CFG: Record<string,{l:string;v:BadgeVariant}> = {
  open:       { l:'Ouvert',   v:'warning' },
  in_progress:{ l:'En cours', v:'info' },
  resolved:   { l:'Resolu',   v:'success' },
  closed:     { l:'Ferme',    v:'default' },
};

const CATEGORIES = ['plomberie','electricite','chauffage','securite','nettoyage','general','autre'];
const PRIORITIES  = [{ v:'low',l:'Faible' },{ v:'normal',l:'Normal' },{ v:'high',l:'Eleve' },{ v:'urgent',l:'Urgent' }];

export default function TenantTicketsPage() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string|null>(null);
  const [companyId, setCompanyId] = useState<string|null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', category:'general', priority:'normal' });
  const [rating, setRating] = useState<{id:string;stars:number}|null>(null);

  useEffect(() => {
    if (!user?.id) return;
    createClient().from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        setTenantId(ta.tenant_id);
        setCompanyId(ta.company_id);
        loadTickets(ta.tenant_id);
      });
  }, [user?.id]);

  const loadTickets = (tid: string) => {
    createClient().from('tenant_tickets').select('*').eq('tenant_id', tid).order('created_at', { ascending:false })
      .then(({ data }) => { setTickets((data||[]) as Ticket[]); setLoading(false); });
  };

  const createTicket = async () => {
    if (!form.title.trim() || !tenantId || !companyId) { toast.error('Titre requis'); return; }
    setSaving(true);
    const { data, error } = await createClient().from('tenant_tickets').insert({
      company_id:companyId, tenant_id:tenantId,
      title:form.title, description:form.description||null,
      category:form.category, priority:form.priority, status:'open',
    } as never).select().single();
    if (error) { toast.error('Erreur creation ticket'); setSaving(false); return; }
    setTickets(prev => [data as Ticket, ...prev]);
    setForm({ title:'', description:'', category:'general', priority:'normal' });
    setShowNew(false);
    toast.success('Ticket cree ! L\'equipe va traiter votre demande.');
    setSaving(false);
  };

  const submitRating = async (ticketId: string, stars: number) => {
    await createClient().from('tenant_tickets').update({ satisfaction:stars } as never).eq('id', ticketId);
    setTickets(prev => prev.map(t => t.id===ticketId ? {...t, satisfaction:stars} : t));
    setRating(null);
    toast.success('Merci pour votre evaluation !');
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Mes signalements</h1>
        <button onClick={()=>setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={15}/> Signaler
        </button>
      </div>

      {tickets.length===0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wrench size={36} className="mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Aucun signalement pour le moment</p>
          <button onClick={()=>setShowNew(true)} className="mt-4 text-primary text-sm hover:underline">+ Signaler un probleme</button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => {
            const sm = STATUS_CFG[t.status]||{l:t.status,v:'default' as BadgeVariant};
            return (
              <div key={t.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.category} · {formatDate(t.created_at)}</p>
                  </div>
                  <Badge variant={sm.v}>{sm.l}</Badge>
                </div>
                {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
                {t.resolution && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 mt-2">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Resolution</p>
                    <p className="text-sm text-green-800 dark:text-green-300">{t.resolution}</p>
                  </div>
                )}
                {t.status==='resolved' && !t.satisfaction && (
                  <button onClick={()=>setRating({id:t.id,stars:0})} className="mt-3 text-xs text-primary hover:underline">
                    ⭐ Evaluer la resolution
                  </button>
                )}
                {t.satisfaction && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1,2,3,4,5].map(s=><Star key={s} size={14} className={s<=t.satisfaction!?'text-amber-400 fill-amber-400':'text-slate-300'}/>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New ticket modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Signaler un probleme</h3>
              <button onClick={()=>setShowNew(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><X size={16}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Titre *</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ex: Fuite robinet salle de bain" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  placeholder="Decrivez le probleme en detail..." rows={3} className={inputCls+' resize-none'}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Categorie</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={selectCls+' w-full'}>
                    {CATEGORIES.map(c=><option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priorite</label>
                  <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} className={selectCls+' w-full'}>
                    {PRIORITIES.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowNew(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-slate-50">Annuler</button>
              <button onClick={createTicket} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                {saving ? <LoadingSpinner size={14}/> : null} Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {rating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xs p-5 text-center">
            <p className="font-bold text-foreground mb-1">Evaluez la resolution</p>
            <p className="text-sm text-muted-foreground mb-4">Comment avez-vous trouve la prise en charge ?</p>
            <div className="flex justify-center gap-2 mb-5">
              {[1,2,3,4,5].map(s=>(
                <button key={s} onClick={()=>setRating(r=>r?{...r,stars:s}:null)}>
                  <Star size={28} className={s<=(rating.stars)?'text-amber-400 fill-amber-400':'text-slate-300 hover:text-amber-300 transition-colors'}/>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setRating(null)} className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground">Annuler</button>
              <button onClick={()=>rating.stars>0&&submitRating(rating.id,rating.stars)} disabled={rating.stars===0}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}