'use client';
import { useEffect, useState } from 'react';
import { Plus, AlertTriangle, Trash2, Car } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Badge, BadgeVariant, cardCls, btnPrimary, selectCls, inputCls, ConfirmDialog } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Accident = {
  id: string; vehicle_id: string; driver_id: string | null; accident_date: string;
  location: string | null; description: string | null; damage_cost: number | null;
  is_fault: boolean; police_report_number: string | null; insurance_claim_number: string | null;
  status: string;
  vehicles: { plate: string; brand: string | null } | null;
  drivers: { first_name: string; last_name: string } | null;
};

const STATUS_MAP: Record<string, { l: string; v: BadgeVariant }> = {
  reported:   { l: 'Déclaré',    v: 'warning' },
  in_process: { l: 'En traitement', v: 'info' },
  closed:     { l: 'Clôturé',   v: 'success'  },
};

export default function AccidentsPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Accident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '', driver_id: '', accident_date: new Date().toISOString().split('T')[0],
    location: '', description: '', damage_cost: '', is_fault: 'false',
    police_report_number: '', insurance_claim_number: '', status: 'reported',
  });
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    createClient().from('accidents')
      .select('id,vehicle_id,driver_id,accident_date,location,description,damage_cost,is_fault,police_report_number,insurance_claim_number,status,vehicles(plate,brand),drivers(first_name,last_name)', { count: 'exact' })
      .eq('company_id', company.id)
      .order('accident_date', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .then(({ data, count }) => { setItems((data || []) as any); setTotal(count || 0); setLoading(false); });
  };

  useEffect(() => {
    if (!company?.id) return;
    load();
    const sb = createClient();
    sb.from('vehicles').select('id,plate').eq('company_id', company.id).order('plate').then(({ data }) => setVehicles(data || []));
    sb.from('drivers').select('id,first_name,last_name').eq('company_id', company.id).order('first_name').then(({ data }) => setDrivers(data || []));
  }, [company?.id, offset]);

  const handleSave = async () => {
    if (!form.vehicle_id || !form.accident_date) { toast.error('Véhicule et date requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('accidents').insert({
      company_id: company!.id, vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || null, accident_date: form.accident_date,
      location: form.location || null, description: form.description || null,
      damage_cost: form.damage_cost ? Number(form.damage_cost) : null,
      is_fault: form.is_fault === 'true',
      police_report_number: form.police_report_number || null,
      insurance_claim_number: form.insurance_claim_number || null,
      status: form.status,
    });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Accident enregistré');
    setShowForm(false);
    setForm({ vehicle_id: '', driver_id: '', accident_date: new Date().toISOString().split('T')[0], location: '', description: '', damage_cost: '', is_fault: 'false', police_report_number: '', insurance_claim_number: '', status: 'reported' });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('accidents').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const totalDamage = items.reduce((s, a) => s + Number(a.damage_cost || 0), 0);

  return (
    <div>
      <PageHeader title="Accidents & sinistres" subtitle={`${total} dossier(s) · Dommages: ${formatCurrency(totalDamage)}`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Déclarer accident</button>}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto'}>
            <h3 className="font-bold text-lg text-foreground">Déclarer un accident</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Véhicule *</label>
                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="">Sélectionner...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Chauffeur</label>
                <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="">Sélectionner...</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date *</label>
                <input type="date" value={form.accident_date} onChange={e => setForm(f => ({ ...f, accident_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Lieu</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls + ' w-full'} placeholder="Dakar, Plateau..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Coût dommages (FCFA)</label>
                <input type="number" value={form.damage_cost} onChange={e => setForm(f => ({ ...f, damage_cost: e.target.value }))} className={inputCls + ' w-full'} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Responsabilité</label>
                <select value={form.is_fault} onChange={e => setForm(f => ({ ...f, is_fault: e.target.value }))} className={selectCls + ' w-full'}>
                  <option value="false">Tiers responsable</option>
                  <option value="true">Notre responsabilité</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">N° PV Police</label>
                <input type="text" value={form.police_report_number} onChange={e => setForm(f => ({ ...f, police_report_number: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">N° Déclaration assurance</label>
                <input type="text" value={form.insurance_claim_number} onChange={e => setForm(f => ({ ...f, insurance_claim_number: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Statut</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={selectCls + ' w-full'}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls + ' w-full'} rows={3} placeholder="Circonstances de l'accident..." />
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
        : items.length === 0 ? <EmptyState icon={<Car size={24} />} title="Aucun accident déclaré" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Déclarer</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Véhicule</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Chauffeur</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Lieu</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Dommages</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Resp.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(item => {
                    const sm = STATUS_MAP[item.status] || { l: item.status, v: 'default' as BadgeVariant };
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{item.vehicles?.plate || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.drivers ? `${item.drivers.first_name} ${item.drivers.last_name}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(item.accident_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.location || '—'}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{item.damage_cost ? formatCurrency(item.damage_cost) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${item.is_fault ? 'text-red-600' : 'text-green-600'}`}>
                            {item.is_fault ? 'Notre faute' : 'Tiers'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><Badge variant={sm.v}>{sm.l}</Badge></td>
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
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
              </div>
            </div>
          )}

      <ConfirmDialog open={!!deleteId} title="Supprimer ce dossier ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
