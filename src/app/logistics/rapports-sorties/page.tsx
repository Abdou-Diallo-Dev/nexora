'use client';
import { useEffect, useState } from 'react';
import { Plus, FileText, Truck, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, cardCls, btnPrimary, inputCls, selectCls, Badge, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type DepartureReport = {
  id: string; vehicle_id: string; driver_id: string | null;
  departure_date: string; return_date: string | null;
  departure_km: number; return_km: number | null;
  departure_fuel: number | null; return_fuel: number | null;
  fuel_added: number | null; fuel_cost: number | null;
  toll_cost: number | null; other_expenses: number | null;
  mission: string | null; destination: string | null;
  status: string; notes: string | null;
  km_traveled: number | null; total_expenses: number | null;
  vehicles: { plate: string; brand: string | null } | null;
  drivers: { first_name: string; last_name: string } | null;
};

const STATUS_MAP: Record<string, { l: string; v: BadgeVariant }> = {
  open:      { l: 'En cours',  v: 'info'    },
  closed:    { l: 'Clôturé',  v: 'success' },
  cancelled: { l: 'Annulé',   v: 'default' },
};

export default function RapportsSortiesPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<DepartureReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showReturn, setShowReturn] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '', driver_id: '', departure_date: new Date().toISOString().split('T')[0],
    departure_km: '', departure_fuel: '', mission: '', destination: '', notes: '',
  });
  const [returnForm, setReturnForm] = useState({
    return_date: new Date().toISOString().split('T')[0],
    return_km: '', return_fuel: '', fuel_added: '', fuel_cost: '',
    toll_cost: '', other_expenses: '',
  });
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('departure_reports')
      .select('id,vehicle_id,driver_id,departure_date,return_date,departure_km,return_km,departure_fuel,return_fuel,fuel_added,fuel_cost,toll_cost,other_expenses,mission,destination,status,notes,km_traveled,total_expenses,vehicles(plate,brand),drivers(first_name,last_name)', { count: 'exact' })
      .eq('company_id', company.id)
      .order('departure_date', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(({ data, count }) => { setItems((data || []) as any); setTotal(count || 0); setLoading(false); });
  };

  useEffect(() => {
    if (!company?.id) return;
    load();
    const sb = createClient();
    sb.from('vehicles').select('id,plate').eq('company_id', company.id).order('plate').then(({ data }) => setVehicles(data || []));
    sb.from('drivers').select('id,first_name,last_name').eq('company_id', company.id).order('first_name').then(({ data }) => setDrivers(data || []));
  }, [company?.id, filterStatus, offset]);

  const handleSave = async () => {
    if (!form.vehicle_id || !form.departure_km) { toast.error('Véhicule et km départ requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('departure_reports').insert({
      company_id: company!.id, vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || null, departure_date: form.departure_date,
      departure_km: Number(form.departure_km),
      departure_fuel: form.departure_fuel ? Number(form.departure_fuel) : null,
      mission: form.mission || null, destination: form.destination || null,
      notes: form.notes || null, status: 'open',
    });
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Rapport de sortie créé');
    setShowForm(false);
    setForm({ vehicle_id: '', driver_id: '', departure_date: new Date().toISOString().split('T')[0], departure_km: '', departure_fuel: '', mission: '', destination: '', notes: '' });
    load();
  };

  const handleCloseReturn = async () => {
    if (!showReturn || !returnForm.return_km) { toast.error('Km retour requis'); return; }
    setSaving(true);
    const { error } = await createClient().from('departure_reports').update({
      return_date: returnForm.return_date,
      return_km: Number(returnForm.return_km),
      return_fuel: returnForm.return_fuel ? Number(returnForm.return_fuel) : null,
      fuel_added: returnForm.fuel_added ? Number(returnForm.fuel_added) : null,
      fuel_cost: returnForm.fuel_cost ? Number(returnForm.fuel_cost) : null,
      toll_cost: returnForm.toll_cost ? Number(returnForm.toll_cost) : null,
      other_expenses: returnForm.other_expenses ? Number(returnForm.other_expenses) : null,
      status: 'closed',
    }).eq('id', showReturn);
    setSaving(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Rapport clôturé');
    setShowReturn(null);
    setReturnForm({ return_date: new Date().toISOString().split('T')[0], return_km: '', return_fuel: '', fuel_added: '', fuel_cost: '', toll_cost: '', other_expenses: '' });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('departure_reports').delete().eq('id', deleteId);
    toast.success('Supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const totalKm = items.filter(r => r.km_traveled).reduce((s, r) => s + Number(r.km_traveled || 0), 0);
  const totalExpenses = items.filter(r => r.total_expenses).reduce((s, r) => s + Number(r.total_expenses || 0), 0);

  return (
    <div>
      <PageHeader title="Rapports de sorties"
        subtitle={`${total} sortie(s) · ${totalKm.toLocaleString('fr-FR')} km · ${formatCurrency(totalExpenses)} dépenses`}
        actions={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} /> Nouvelle sortie</button>}
      />

      <div className="flex gap-3 mb-5">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-40'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* Departure form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-lg p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Nouvelle sortie véhicule</h3>
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
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date départ *</label>
                <input type="date" value={form.departure_date} onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Km départ *</label>
                <input type="number" value={form.departure_km} onChange={e => setForm(f => ({ ...f, departure_km: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Niveau carburant départ (L)</label>
                <input type="number" value={form.departure_fuel} onChange={e => setForm(f => ({ ...f, departure_fuel: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Destination</label>
                <input type="text" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className={inputCls + ' w-full'} placeholder="Thiès, Saint-Louis..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Mission</label>
                <input type="text" value={form.mission} onChange={e => setForm(f => ({ ...f, mission: e.target.value }))} className={inputCls + ' w-full'} placeholder="Livraison client X, Transport matériaux..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls + ' w-full'} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Créer sortie'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Return form */}
      {showReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={cardCls + ' w-full max-w-lg p-6 space-y-4'}>
            <h3 className="font-bold text-lg text-foreground">Clôturer la sortie — Retour véhicule</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date retour</label>
                <input type="date" value={returnForm.return_date} onChange={e => setReturnForm(f => ({ ...f, return_date: e.target.value }))} className={inputCls + ' w-full'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Km retour *</label>
                <input type="number" value={returnForm.return_km} onChange={e => setReturnForm(f => ({ ...f, return_km: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Niveau carburant retour (L)</label>
                <input type="number" value={returnForm.return_fuel} onChange={e => setReturnForm(f => ({ ...f, return_fuel: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Carburant ajouté (L)</label>
                <input type="number" value={returnForm.fuel_added} onChange={e => setReturnForm(f => ({ ...f, fuel_added: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Coût carburant (FCFA)</label>
                <input type="number" value={returnForm.fuel_cost} onChange={e => setReturnForm(f => ({ ...f, fuel_cost: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Péage (FCFA)</label>
                <input type="number" value={returnForm.toll_cost} onChange={e => setReturnForm(f => ({ ...f, toll_cost: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Autres dépenses (FCFA)</label>
                <input type="number" value={returnForm.other_expenses} onChange={e => setReturnForm(f => ({ ...f, other_expenses: e.target.value }))} className={inputCls + ' w-full'} min="0" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReturn(null)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Annuler</button>
              <button onClick={handleCloseReturn} disabled={saving} className={btnPrimary}>{saving ? '...' : 'Clôturer'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : items.length === 0 ? <EmptyState icon={<Truck size={24} />} title="Aucune sortie enregistrée" action={<button onClick={() => setShowForm(true)} className={btnPrimary}><Plus size={16} />Nouvelle sortie</button>} />
          : (
            <div className={cardCls}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Véhicule</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Chauffeur</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Départ</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Destination</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Km</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase text-right">Dépenses</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(r => {
                    const sm = STATUS_MAP[r.status] || { l: r.status, v: 'default' as BadgeVariant };
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{r.vehicles?.plate || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.drivers ? `${r.drivers.first_name} ${r.drivers.last_name}` : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(r.departure_date)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.destination || r.mission || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{r.km_traveled ? `${r.km_traveled} km` : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{r.total_expenses ? formatCurrency(r.total_expenses) : '—'}</td>
                        <td className="px-4 py-3"><Badge variant={sm.v}>{sm.l}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {r.status === 'open' && (
                              <button onClick={() => setShowReturn(r.id)} title="Enregistrer retour" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FileText size={14} /></button>
                            )}
                            <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
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

      <ConfirmDialog open={!!deleteId} title="Supprimer ce rapport ?" description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
