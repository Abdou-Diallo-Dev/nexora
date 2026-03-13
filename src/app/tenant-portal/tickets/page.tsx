'use client';
import { useEffect, useState } from 'react';
import { Plus, Wrench, X, Star, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant, inputCls, selectCls, labelCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Ticket = {
  id: string; title: string; description: string | null; category: string;
  priority: string; status: string; created_at: string;
  resolution: string | null; satisfaction: number | null;
};

const STATUS_CFG: Record<string, { l: string; v: BadgeVariant; icon: React.ReactNode }> = {
  open:        { l: 'Ouvert',   v: 'warning', icon: <AlertTriangle size={12} /> },
  in_progress: { l: 'En cours', v: 'info',    icon: <Clock size={12} /> },
  resolved:    { l: 'Résolu',   v: 'success', icon: <CheckCircle size={12} /> },
  closed:      { l: 'Fermé',    v: 'default', icon: <X size={12} /> },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-green-600', normal: 'text-amber-600', high: 'text-orange-600', urgent: 'text-red-600',
};
const PRIORITY_LABEL: Record<string, string> = {
  low: 'Faible', normal: 'Normal', high: 'Élevé', urgent: 'Urgent',
};

const CATEGORIES = [
  { v: 'plomberie', l: '🔧 Plomberie' },
  { v: 'electricite', l: '⚡ Électricité' },
  { v: 'chauffage', l: '🌡️ Chauffage' },
  { v: 'securite', l: '🔒 Sécurité' },
  { v: 'nettoyage', l: '🧹 Nettoyage' },
  { v: 'general', l: '🏠 Général' },
  { v: 'autre', l: '📋 Autre' },
];
const PRIORITIES = [
  { v: 'low', l: 'Faible' }, { v: 'normal', l: 'Normal' },
  { v: 'high', l: 'Élevé' }, { v: 'urgent', l: 'Urgent ⚠️' },
];

export default function TenantTicketsPage() {
  const { user } = useAuthStore();
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tenantId, setTenantId]   = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showNew, setShowNew]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ title: '', description: '', category: 'general', priority: 'normal' });
  const [rating, setRating]       = useState<{ id: string; stars: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    sb.from('tenant_accounts').select('tenant_id,company_id').eq('user_id', user.id).maybeSingle()
      .then(({ data: ta }) => {
        if (!ta) { setLoading(false); return; }
        setTenantId(ta.tenant_id);
        setCompanyId(ta.company_id);

        // Load tickets
        sb.from('tenant_tickets').select('*').eq('tenant_id', ta.tenant_id)
          .order('created_at', { ascending: false })
          .then(({ data }) => { setTickets((data || []) as Ticket[]); setLoading(false); });

        // Realtime — status updates from admin
        const channel = sb.channel(`tenant-tickets-${ta.tenant_id}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'tenant_tickets',
            filter: `tenant_id=eq.${ta.tenant_id}`,
          }, (payload) => {
            if (payload.eventType === 'INSERT') {
              setTickets(prev => [payload.new as Ticket, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setTickets(prev => prev.map(t => t.id === (payload.new as Ticket).id ? payload.new as Ticket : t));
              toast.info(`Ticket mis à jour : ${(payload.new as Ticket).status}`);
            }
          })
          .subscribe();

        return () => { sb.removeChannel(channel); };
      });
  }, [user?.id]);

  const createTicket = async () => {
    if (!form.title.trim() || !tenantId || !companyId) { toast.error('Titre requis'); return; }
    setSaving(true);
    const { data, error } = await createClient().from('tenant_tickets').insert({
      company_id: companyId, tenant_id: tenantId,
      title: form.title, description: form.description || null,
      category: form.category, priority: form.priority, status: 'open',
    } as never).select().single();
    if (error) { toast.error('Erreur création ticket'); setSaving(false); return; }
    setTickets(prev => [data as Ticket, ...prev]);
    setForm({ title: '', description: '', category: 'general', priority: 'normal' });
    setShowNew(false);
    toast.success('Signalement envoyé ! L\'équipe va traiter votre demande.');
    setSaving(false);
  };

  const submitRating = async (ticketId: string, stars: number) => {
    await createClient().from('tenant_tickets').update({ satisfaction: stars } as never).eq('id', ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, satisfaction: stars } : t));
    setRating(null);
    toast.success('Merci pour votre évaluation !');
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mes signalements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tickets.length} ticket(s)</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={15} /> Signaler un problème
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ouverts',   count: tickets.filter(t => t.status === 'open').length,        color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' },
          { label: 'En cours',  count: tickets.filter(t => t.status === 'in_progress').length,  color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
          { label: 'Résolus',   count: tickets.filter(t => t.status === 'resolved').length,     color: 'bg-green-50 text-green-600 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-3 text-center`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wrench size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground mb-1">Aucun signalement</p>
          <p className="text-sm mb-4">Signalez un problème et notre équipe s'en occupera</p>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">
            Signaler un problème
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => {
            const sm = STATUS_CFG[t.status] || { l: t.status, v: 'default' as BadgeVariant, icon: null };
            return (
              <div key={t.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">{t.category}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={`text-xs font-medium ${PRIORITY_COLOR[t.priority] || ''}`}>
                        {PRIORITY_LABEL[t.priority] || t.priority}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatDate(t.created_at)}</span>
                    </div>
                  </div>
                  <Badge variant={sm.v}>
                    <span className="flex items-center gap-1">{sm.icon} {sm.l}</span>
                  </Badge>
                </div>

                {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}

                {/* Progress bar */}
                <div className="flex items-center gap-1.5 mt-3 mb-1">
                  {['open', 'in_progress', 'resolved'].map((s, i) => {
                    const steps = ['open', 'in_progress', 'resolved', 'closed'];
                    const current = steps.indexOf(t.status);
                    const isActive = steps.indexOf(s) <= current;
                    return (
                      <div key={s} className="flex items-center gap-1.5 flex-1">
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-muted-foreground">Ouvert</span>
                  <span className="text-[10px] text-muted-foreground">En cours</span>
                  <span className="text-[10px] text-muted-foreground">Résolu</span>
                </div>

                {t.resolution && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 mt-3">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">✅ Résolution</p>
                    <p className="text-sm text-green-800 dark:text-green-300">{t.resolution}</p>
                  </div>
                )}

                {t.status === 'resolved' && !t.satisfaction && (
                  <button onClick={() => setRating({ id: t.id, stars: 0 })}
                    className="mt-3 text-xs text-primary hover:underline flex items-center gap-1">
                    <Star size={12} /> Évaluer la résolution
                  </button>
                )}
                {t.satisfaction && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={14} className={s <= t.satisfaction! ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nouveau ticket */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Signaler un problème</h3>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Titre *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Fuite robinet salle de bain" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez le problème en détail..." rows={3} className={inputCls + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Catégorie</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selectCls + ' w-full'}>
                    {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priorité</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={selectCls + ' w-full'}>
                    {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-slate-50">Annuler</button>
              <button onClick={createTicket} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 flex items-center justify-center gap-2">
                {saving ? <LoadingSpinner size={14} /> : <Plus size={14} />} Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal évaluation */}
      {rating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xs p-5 text-center shadow-2xl">
            <p className="font-bold text-foreground mb-1">Évaluez la résolution</p>
            <p className="text-sm text-muted-foreground mb-4">Comment avez-vous trouvé la prise en charge ?</p>
            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(r => r ? { ...r, stars: s } : null)}>
                  <Star size={28} className={s <= (rating.stars) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-300 transition-colors'} />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRating(null)} className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground">Annuler</button>
              <button onClick={() => rating.stars > 0 && submitRating(rating.id, rating.stars)} disabled={rating.stars === 0}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}