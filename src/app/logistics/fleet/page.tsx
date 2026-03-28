'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Truck, AlertTriangle, Edit, Trash2, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, btnPrimary, cardCls, selectCls, BadgeVariant, ConfirmDialog } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { usePagination } from '@/lib/hooks';
import { toast } from 'sonner';

type Vehicle = {
  id: string; type: string; custom_type?: string | null;
  brand: string | null; model: string | null; plate: string;
  year: number | null; capacity_kg: number | null; status: string;
  insurance_expiry: string | null; inspection_expiry: string | null; created_at: string;
};

const STATUS_CONFIG: Record<string, { l: string; dot: string }> = {
  operational: { l: 'Opérationnel', dot: '#16a34a' },
  available:   { l: 'Disponible',   dot: '#16a34a' },
  on_mission:  { l: 'En mission',   dot: '#3d2674' },
  maintenance: { l: 'Maintenance',  dot: '#ea580c' },
  panne:       { l: 'En panne',     dot: '#dc2626' },
  inactive:    { l: 'Inactif',      dot: '#9ca3af' },
};

const VEHICLE_TYPES: Record<string, string> = {
  goder:        'Goder (benne)',
  plateau:      'Plateau',
  citerne:      'Citerne',
  semi_remorque:'Semi-remorque',
  frigorifique: 'Frigorifique',
  fourgon:      'Fourgon',
  pick_up:      'Pick-up',
  moto:         'Moto',
  truck:        'Camion',
  van:          'Van',
  car:          'Voiture',
  autre:        'Autre',
};

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { l: status, dot: '#9ca3af' };
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.dot }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }}/>
      {cfg.l}
    </span>
  );
}

export default function FleetPage() {
  const { company } = useAuthStore();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { page, pageSize, offset, setPage } = usePagination(20);

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    let q = createClient().from('vehicles')
      .select('id,type,custom_type,brand,model,plate,year,capacity_kg,status,insurance_expiry,inspection_expiry,created_at', { count: 'exact' })
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (filterStatus) q = q.eq('status', filterStatus);
    q.then(
      ({ data, count }) => { setItems((data || []) as Vehicle[]); setTotal(count || 0); setLoading(false); },
      (err: any) => { toast.error('Erreur: ' + (err?.message || 'requête échouée')); setLoading(false); }
    );
  };

  useEffect(load, [company?.id, filterStatus, offset, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await createClient().from('vehicles').delete().eq('id', deleteId);
    toast.success('Véhicule supprimé');
    setDeleteId(null); setDeleting(false); load();
  };

  const now = new Date();
  const operational = items.filter(v => v.status === 'operational' || v.status === 'available').length;

  const getTypeLabel = (v: Vehicle) => {
    if (v.type === 'autre' && v.custom_type) return v.custom_type;
    return VEHICLE_TYPES[v.type] || v.type;
  };

  return (
    <div>
      <PageHeader
        title="Flotte de véhicules"
        subtitle={`${total} véhicule(s) · ${operational} opérationnel(s)`}
        actions={<Link href="/logistics/fleet/new" className={btnPrimary}><Plus size={16}/> Ajouter véhicule</Link>}
      />

      <div className="flex gap-3 mb-5">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls + ' w-48'}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_CONFIG).slice(0, 5).map(([v, { l }]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {loading
        ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32}/></div>
        : items.length === 0
          ? <EmptyState icon={<Truck size={24}/>} title="Aucun véhicule" action={<Link href="/logistics/fleet/new" className={btnPrimary}><Plus size={16}/>Ajouter</Link>}/>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(v => {
                const insuranceExpiring = v.insurance_expiry && (new Date(v.insurance_expiry).getTime() - now.getTime()) / 86400000 <= 30;
                const inspectionExpiring = v.inspection_expiry && (new Date(v.inspection_expiry).getTime() - now.getTime()) / 86400000 <= 30;
                return (
                  <div key={v.id} className={cardCls + ' p-4 hover:shadow-md transition-shadow'}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Truck size={18} className="text-primary"/>
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{v.plate}</p>
                          <p className="text-xs text-muted-foreground">{v.brand || ''} {v.model || ''} {v.year || ''}</p>
                        </div>
                      </div>
                      <StatusDot status={v.status}/>
                    </div>

                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-muted-foreground">Type : <span className="font-medium text-foreground">{getTypeLabel(v)}</span></p>
                      {v.capacity_kg && <p className="text-xs text-muted-foreground">Capacité : <span className="font-medium text-foreground">{v.capacity_kg} kg</span></p>}
                    </div>

                    {(insuranceExpiring || inspectionExpiring) && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 mb-3">
                        <p className="text-xs text-amber-700 flex items-center gap-1">
                          <AlertTriangle size={11}/>
                          {insuranceExpiring ? 'Assurance expire bientôt' : ''}
                          {insuranceExpiring && inspectionExpiring ? ' · ' : ''}
                          {inspectionExpiring ? 'Visite expire bientôt' : ''}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex gap-1">
                        <Link href={`/logistics/fleet/${v.id}/edit`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Modifier">
                          <Edit size={14}/>
                        </Link>
                        <Link href={`/logistics/maintenance`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 transition-colors" title="Voir maintenance">
                          <Wrench size={14}/>
                        </Link>
                        <button onClick={() => setDeleteId(v.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                      {v.insurance_expiry && (
                        <p className="text-xs text-muted-foreground">Ass. {formatDate(v.insurance_expiry)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
      }

      <div className="mt-4">
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage}/>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer ce véhicule ?"
        description="Action irréversible."
        confirmLabel={deleting ? 'Suppression...' : 'Supprimer'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
