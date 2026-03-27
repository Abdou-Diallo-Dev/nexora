'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Wrench, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Badge, BadgeVariant, cardCls, btnPrimary, selectCls, inputCls, ConfirmDialog } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type MaintenanceRecord = {
  id: string;
  vehicle_id: string;
  type: string;
  description: string | null;
  cost: number | null;
  performed_at: string;
  next_due_at: string | null;
  mileage_at_service: number | null;
  performed_by: string | null;
  status: string;
  vehicles: { plate: string; brand: string | null; model: string | null } | null;
};

const TYPE_MAP: Record<string, string> = {
  reparation: 'Réparation',
  vidange: 'Vidange',
  entretien: 'Entretien général',
  pneu: 'Pneumatiques',
  frein: 'Freins',
  ct: 'Contrôle technique',
};

const STATUS_MAP: Record<string, { l: string; v: BadgeVariant }> = {
  planned:   { l: 'Planifié',   v: 'warning' },
  in_progress:{ l: 'En cours',  v: 'info'    },
  done:      { l: 'Terminé',   v: 'success'  },
};

export default function MaintenancePage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<MaintenanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string; brand: string | null }[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '', type: 'entretien', description: '', cost: '', performed_at: new Date().toISOString().split('T')[0],
    next_due_at: '', mileage_at_service: '', performed_by: '', status: 'done',
  });
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('vehicle_maintenance')
      .select('id,vehicle_id,type,description,cost,performed_at,next_due_at,mileage_at_service,performed_by,status,vehicles(plate,brand,model)', { count: 'exact' })
      .eq('company_id', company.id)
      .order('performed_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterType) q = q.eq('type', filterType);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(({ data, count }) => { setItems((data || []) as any); setTotal(count || 0); setLoading(false); })
      .catch(err => { console.error('Erreur chargement maintenance:', err); toast.error('Erreur: ' + (err?.message || 'requête échouée')); setLoading(false); });
  };

  useEffect(() => {
    if (!company?.id) return;
    load();
    createClient().from('vehicles').select('id,plate,brand').eq('company_id', company.id).order('plate')
      .then(({ data }) => setVehicles(data || []))
      .catch(err => console.error('Erreur chargement véhicules:', err));
  }, [company?.id, filterType, filterStatus, offset]);

  const handleSave = async () => {
    if (!form.vehicle_id || !form.performed_at) { toast.error('Véhicule et date requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('vehicle_maintenance').insert({
      company_id: company!.id, vehicle_id: form.vehicle_id, type: form.type,
      description: form.description || null, cost: form.cost ? Number(form.cost) : null,
      performed_at: form.performed_at, next_due_at: form.next_due_at || null,
      mileage_at_service: form.mileage_at_service ? Number(form.mileage_at_service) : null,
      performed_by: form.performed_by || null, status: form.status,
    });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Maintenance enregistrée');
    setShowForm(false);
    setForm({ vehicle_id: '', type: 'entretien', description: '', cost: '', performed_at: new Date().toISOString().split('T')[0], next_due_at: '', mileage_at_service: '', performed_by: '', status: 'done' });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('vehicle_maintenance').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  return (
    <div>
      <PageHeader title="Maintenance véhicules" subtitle={`${total} intervention(s)`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Ajouter</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={selectCls + ' w-44'}>
          <option value="">Tous types</option>
          {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-40'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-lg p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Nouvelle intervention</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Véhicule *</label>
                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="">Sélectionner...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} {v.brand ? `(${v.brand})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={selectCls + ' w-full'}>
                  {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Statut</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectCls + ' w-full'}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date intervention *</label>
                <input type="date" value={form.performed_at} onChange={e => setForm(f => ({ ...f, performed_at: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Prochaine échéance</label>
                <input type="date" value={form.next_due_at} onChange={e => setForm(f => ({ ...f, next_due_at: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Coût (FCFA)</label>
                <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className={inputCls + ' w-full'} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Kilométrage</label>
                <input type="number" value={form.mileage_at_service} onChange={e => setForm(f => ({ ...f, mileage_at_service: e.target.value }))} className={inputCls + ' w-full'} placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Réalisé par</label>
                <input type="text" value={form.performed_by} onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))} className={inputCls + ' w-full'} placeholder="Prestataire / Mécanicien" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls + ' w-full'} rows={2} placeholder="Détails de l'intervention..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<Wrench size={24} />} title="Aucune intervention" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Ajouter</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Véhicule</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Coût</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Prochaine</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(item => {
                    const sm = STATUS_MAP[item.status] || { l: item.status, v: 'default' as BadgeVariant };
                    const isOverdue = item.next_due_at && new Date(item.next_due_at) < new Date();
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{item.vehicles?.plate || '—'}</p>
                          <p className="text-xs text-muted-foreground">{item.vehicles?.brand || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-foreground">{TYPE_MAP[item.type] || item.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(item.performed_at)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{item.cost ? formatCurrency(item.cost) : '—'}</td>
                        <td className="px-4 py-3"><Badge variant={sm.v}>{sm.l}</Badge></td>
                        <td className="px-4 py-3">
                          {item.next_due_at ? (
                            <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {isOverdue && <AlertTriangle size={11} className="inline mr-1" />}
                              {formatDate(item.next_due_at)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-border">
                <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
              </div>
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer cette intervention ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
