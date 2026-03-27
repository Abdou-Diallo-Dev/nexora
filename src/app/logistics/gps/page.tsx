'use client';
import { useEffect, useState } from 'react';
import { MapPin, Truck, RefreshCw, Navigation } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, Badge, BadgeVariant } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type GpsEntry = {
  id: string; vehicle_id: string; latitude: number; longitude: number;
  speed_kmh: number | null; heading: number | null; recorded_at: string;
  address: string | null; event_type: string | null;
  vehicles: { plate: string; brand: string | null; status: string } | null;
};

const STATUS_V: Record<string, BadgeVariant> = { available: 'success', on_mission: 'info', maintenance: 'warning', inactive: 'default' };
const STATUS_L: Record<string, string> = { available: 'Disponible', on_mission: 'En mission', maintenance: 'Maintenance', inactive: 'Inactif' };

export default function GpsPage() {
  const { company } = useAuthStore();
  const [entries, setEntries] = useState<GpsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = () => {
    if (!company?.id) return;
    setLoading(true);
    // Get latest GPS position per vehicle
    createClient().from('gps_tracking')
      .select('id,vehicle_id,latitude,longitude,speed_kmh,heading,recorded_at,address,event_type,vehicles(plate,brand,status)')
      .eq('company_id', company.id)
      .order('recorded_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        // Keep only latest entry per vehicle
        const seen = new Set<string>();
        const unique = (data || []).filter((e: any) => {
          if (seen.has(e.vehicle_id)) return false;
          seen.add(e.vehicle_id);
          return true;
        });
        setEntries(unique as any);
        setLastRefresh(new Date());
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [company?.id]);

  const onMission = entries.filter(e => e.vehicles?.status === 'on_mission').length;

  return (
    <div>
      <PageHeader
        title="Suivi GPS — Flotte"
        subtitle={`${entries.length} véhicule(s) tracké(s) · ${onMission} en mission`}
        actions={
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <RefreshCw size={15} /> Actualiser
          </button>
        }
      />

      <p className="text-xs text-muted-foreground mb-5">Dernière actualisation : {lastRefresh.toLocaleTimeString('fr-FR')}</p>

      {loading ? <div className="flex justify-center h-48 items-center"><LoadingSpinner size={32} /></div>
        : entries.length === 0 ? (
          <EmptyState
            icon={<MapPin size={24} />}
            title="Aucune donnée GPS"
            description="Les données GPS s'afficheront ici une fois les traceurs configurés sur vos véhicules."
          />
        ) : (
          <div className="space-y-4">
            {/* Map placeholder */}
            <div className={cardCls + ' p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50'} style={{ minHeight: 280 }}>
              <MapPin size={36} className="text-muted-foreground mb-3" />
              <p className="font-semibold text-foreground">Carte GPS interactive</p>
              <p className="text-sm text-muted-foreground mt-1">Intégration cartographique à configurer (Mapbox / Google Maps)</p>
              <p className="text-xs text-muted-foreground mt-1">{entries.length} véhicule(s) avec coordonnées disponibles</p>
            </div>

            {/* Vehicle list */}
            <div className={cardCls}>
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Positions actuelles</h3>
              </div>
              <div className="divide-y divide-border">
                {entries.map(e => {
                  const v = e.vehicles;
                  const sv = v?.status || 'inactive';
                  const minutesAgo = Math.round((Date.now() - new Date(e.recorded_at).getTime()) / 60000);
                  return (
                    <div key={e.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <Truck size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{v?.plate || '—'}</p>
                          <Badge variant={STATUS_V[sv] || 'default'}>{STATUS_L[sv] || sv}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.address || `${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {e.speed_kmh !== null && (
                          <div className="flex items-center gap-1 justify-end">
                            <Navigation size={12} className="text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{e.speed_kmh} km/h</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {minutesAgo === 0 ? 'À l\'instant' : `Il y a ${minutesAgo} min`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
