'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileDown, CheckCircle2, Clock, Wrench, XCircle, ChevronRight, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import {
  PageHeader, Badge, LoadingSpinner,
  inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls, BadgeVariant,
} from '@/components/ui';
import { formatDate, formatCurrency, generateReference } from '@/lib/utils';
import { generateMaintenancePDF } from '@/lib/pdf';
import { toast } from 'sonner';

type Ticket = {
  id: string; title: string; description: string | null;
  category: string; priority: string; status: string;
  scheduled_date: string | null; completed_date: string | null;
  estimated_cost: number | null; actual_cost: number | null;
  notes: string | null; created_at: string;
  properties: { name: string; address: string } | null;
  tenants: { first_name: string; last_name: string } | null;
};

const STATUSES = [
  { key: 'open',        label: 'Ouvert',    icon: <XCircle size={16} />,       color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',     badge: 'error'   as BadgeVariant },
  { key: 'in_progress', label: 'En cours',  icon: <Clock size={16} />,          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', badge: 'warning' as BadgeVariant },
  { key: 'resolved',    label: 'Résolu',    icon: <CheckCircle2 size={16} />,   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    badge: 'success' as BadgeVariant },
  { key: 'closed',      label: 'Fermé',     icon: <Wrench size={16} />,         color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       badge: 'default' as BadgeVariant },
];
const PRIORITY_LABELS: Record<string,string> = { low:'Faible', medium:'Moyen', high:'Élevé', urgent:'URGENT' };
const PRIORITY_VARIANTS: Record<string,BadgeVariant> = { low:'info', medium:'warning', high:'warning', urgent:'error' };
const CAT_LABELS: Record<string,string> = { plumbing:'Plomberie', electricity:'Électricité', hvac:'Climatisation', structural:'Structure', appliance:'Électroménager', pest_control:'Nuisibles', other:'Autre' };

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useAuthStore();
  const router = useRouter();
  const [t, setT] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editActualCost, setEditActualCost] = useState('');
  const [editScheduled, setEditScheduled] = useState('');
  const [showUpdate, setShowUpdate] = useState(false);

  const load = () => {
    createClient().from('maintenance_tickets')
      .select('*,properties(name,address),tenants(first_name,last_name)')
      .eq('id', id).maybeSingle()
      .then(({ data }) => { 
        const ticket = data as Ticket;
        setT(ticket);
        setEditNotes(ticket?.notes || '');
        setEditActualCost(ticket?.actual_cost ? String(ticket.actual_cost) : '');
        setEditScheduled(ticket?.scheduled_date || '');
        setLoading(false);
      });
  };

  useEffect(load, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!t) return;
    setUpdating(true);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'resolved' || newStatus === 'closed') {
      updates.completed_date = new Date().toISOString().slice(0, 10);
    }
    const { error } = await createClient().from('maintenance_tickets').update(updates as never).eq('id', id);
    setUpdating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Statut mis à jour');
    load();
  };

  const handleSaveUpdate = async () => {
    setUpdating(true);
    const { error } = await createClient().from('maintenance_tickets').update({
      notes: editNotes || null,
      actual_cost: editActualCost ? Number(editActualCost) : null,
      scheduled_date: editScheduled || null,
    } as never).eq('id', id);
    setUpdating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Mis à jour');
    setShowUpdate(false);
    load();
  };

  const handleGeneratePDF = async () => {
    if (!t) return;
    setGenerating(true);
    try {
      const ref = `TKT-${t.created_at.slice(0,10).replace(/-/g,'')}-${id.slice(0,6).toUpperCase()}`;
      await generateMaintenancePDF({
        ticketRef: ref,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        propertyName: t.properties?.name || '—',
        propertyAddress: t.properties?.address,
        tenantName: t.tenants ? `${t.tenants.first_name} ${t.tenants.last_name}` : null,
        scheduledDate: t.scheduled_date,
        completedDate: t.completed_date,
        estimatedCost: t.estimated_cost ?? undefined,
        actualCost: t.actual_cost ?? undefined,
        notes: t.notes,
        createdAt: t.created_at,
        companyName: company?.name || 'ImmoGest Pro',
      });
      toast.success('Ticket PDF téléchargé');
    } catch { toast.error('Erreur génération PDF'); }
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;
  if (!t) return <div className="text-center py-16 text-muted-foreground">Ticket introuvable</div>;

  const currentStatus = STATUSES.find(s => s.key === t.status);
  const currentIdx = STATUSES.findIndex(s => s.key === t.status);

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/real-estate/maintenance" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <div className="flex-1" />
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          {generating ? <LoadingSpinner size={15} /> : <FileDown size={15} />}
          Ticket PDF
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.properties?.name} {t.tenants && `· ${t.tenants.first_name} ${t.tenants.last_name}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={PRIORITY_VARIANTS[t.priority] || 'default'}>{PRIORITY_LABELS[t.priority] || t.priority}</Badge>
          {currentStatus && <Badge variant={currentStatus.badge}>{currentStatus.label}</Badge>}
        </div>
      </div>

      {/* ─── PROGRESSION TRACKER ─────────────────────────────── */}
      <div className={cardCls + ' p-5'}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Suivi du ticket</p>
        <div className="flex items-center gap-0">
          {STATUSES.map((s, i) => {
            const done = i <= currentIdx;
            const current = i === currentIdx;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => { if (!done || current) handleStatusChange(s.key); }}
                    disabled={updating || i < currentIdx}
                    title={i > currentIdx ? `Passer à "${s.label}"` : s.label}
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center transition-all font-semibold text-sm
                      ${done ? (current ? 'ring-2 ring-primary ring-offset-2 ' : '') + s.color : 'bg-slate-100 dark:bg-slate-700 text-muted-foreground'}
                      ${i > currentIdx ? 'cursor-pointer hover:opacity-80' : ''}
                      ${i < currentIdx ? 'opacity-60' : ''}
                    `}
                  >
                    {done ? s.icon : <span className="text-xs font-bold">{i+1}</span>}
                  </button>
                  <span className={`text-xs mt-1.5 font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
                {i < STATUSES.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-4 transition-colors ${i < currentIdx ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Quick action buttons */}
        {t.status !== 'closed' && (
          <div className="mt-4 pt-4 border-t border-border flex gap-2 flex-wrap">
            {STATUSES.filter((s, i) => i > currentIdx).map(s => (
              <button
                key={s.key}
                onClick={() => handleStatusChange(s.key)}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-foreground"
              >
                {s.icon}
                Passer à <strong>{s.label}</strong>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cardCls + ' divide-y divide-border'}>
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails</p>
          </div>
          {[
            ['Catégorie', CAT_LABELS[t.category] || t.category],
            ['Priorité', PRIORITY_LABELS[t.priority] || t.priority],
            ['Date de création', formatDate(t.created_at)],
            ['Date planifiée', t.scheduled_date ? formatDate(t.scheduled_date) : '—'],
            ['Date de clôture', t.completed_date ? formatDate(t.completed_date) : '—'],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between px-5 py-2.5">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>

        <div className={cardCls + ' divide-y divide-border'}>
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coûts</p>
          </div>
          {[
            ['Coût estimé', t.estimated_cost != null ? formatCurrency(t.estimated_cost) : '—'],
            ['Coût réel', t.actual_cost != null ? formatCurrency(t.actual_cost) : '—'],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between px-5 py-2.5">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-semibold text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {t.description && (
        <div className={cardCls + ' p-5'}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{t.description}</p>
        </div>
      )}

      {/* Notes de suivi */}
      <div className={cardCls + ' p-5'}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes de suivi</p>
          <button
            onClick={() => setShowUpdate(!showUpdate)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {showUpdate ? 'Annuler' : '+ Mettre à jour'}
          </button>
        </div>

        {t.notes ? (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{t.notes}</p>
          </div>
        ) : !showUpdate && (
          <p className="text-sm text-muted-foreground italic">Aucune note pour le moment.</p>
        )}

        {showUpdate && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div>
              <label className={labelCls}>Notes / Observations</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Décrivez les actions effectuées, les problèmes rencontrés..."
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Coût réel (FCFA)</label>
                <input type="number" value={editActualCost} onChange={e => setEditActualCost(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date planifiée</label>
                <input type="date" value={editScheduled} onChange={e => setEditScheduled(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveUpdate} disabled={updating} className={btnPrimary}>
                {updating ? <LoadingSpinner size={14} /> : <Save size={14} />}Enregistrer
              </button>
              <button onClick={() => setShowUpdate(false)} className={btnSecondary}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}