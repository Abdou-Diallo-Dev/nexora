'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Home, Users, Wrench, CheckCircle, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, EmptyState, cardCls, btnPrimary, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

type Property = { id:string; name:string; address:string; floors_count:number|null };
type Apartment = {
  id:string; name:string; floor:string; floor_number:number; status:string;
  rooms_count:number; surface_m2:number|null; rent_amount:number|null;
  tenants:{first_name:string;last_name:string}|null;
};

const FLOOR_LABEL = (n: number) => n === 0 ? 'RDC' : `R+${n}`;
const STATUS_MAP: Record<string,{l:string;v:'success'|'warning'|'error'|'default'}> = {
  available:   { l:'Disponible',   v:'success' },
  occupied:    { l:'Occupé',       v:'warning' },
  maintenance: { l:'Maintenance',  v:'error' },
};

export default function ApartmentsPage() {
  const { company } = useAuthStore();
  const params = useParams();
  const propertyId = params?.id as string;
  const [property, setProperty] = useState<Property|null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genConfig, setGenConfig] = useState({ floors: 3, aptsPerFloor: 2, hasRDC: true, rdcApts: 2 });

  const load = async () => {
    if (!propertyId) return;
    const sb = createClient();
    const [{ data: prop }, { data: apts }] = await Promise.all([
      sb.from('properties').select('id,name,address,floors_count').eq('id', propertyId).maybeSingle(),
      sb.from('apartments').select('id,name,floor,floor_number,status,rooms_count,surface_m2,rent_amount,tenants(first_name,last_name)')
        .eq('property_id', propertyId).order('floor_number').order('name'),
    ]);
    setProperty(prop as Property);
    setApartments((apts||[]) as unknown as Apartment[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [propertyId]);

  const generateApartments = async () => {
    if (!property || !company?.id) return;
    setGenerating(true);
    const sb = createClient();
    const prefix = property.name.split(' ')[0].toUpperCase().slice(0, 6);
    const inserts: any[] = [];
    const letters = ['A','B','C','D','E','F','G','H'];

    // RDC
    if (genConfig.hasRDC) {
      for (let a = 0; a < genConfig.rdcApts; a++) {
        inserts.push({
          company_id: company.id, property_id: propertyId,
          name: `${prefix} R${letters[a]}`,
          floor: 'RDC', floor_number: 0, status: 'available',
        });
      }
    }
    // Upper floors
    for (let f = 1; f <= genConfig.floors; f++) {
      for (let a = 0; a < genConfig.aptsPerFloor; a++) {
        inserts.push({
          company_id: company.id, property_id: propertyId,
          name: `${prefix} ${f}${letters[a]}`,
          floor: `R+${f}`, floor_number: f, status: 'available',
        });
      }
    }

    const { error } = await sb.from('apartments').insert(inserts);
    setGenerating(false);
    setShowGenModal(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${inserts.length} appartements créés ✓`);
    load();
  };

  // Group by floor
  const byFloor = apartments.reduce((acc, apt) => {
    const key = apt.floor;
    if (!acc[key]) acc[key] = [];
    acc[key].push(apt);
    return acc;
  }, {} as Record<string, Apartment[]>);

  const floors = Object.keys(byFloor).sort((a,b) => {
    const na = a==='RDC'?0:parseInt(a.replace('R+',''));
    const nb = b==='RDC'?0:parseInt(b.replace('R+',''));
    return na-nb;
  });

  const stats = {
    total: apartments.length,
    available: apartments.filter(a=>a.status==='available').length,
    occupied: apartments.filter(a=>a.status==='occupied').length,
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/real-estate/properties" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <div className="flex-1">
          <PageHeader title={property?.name||'Immeuble'} subtitle={property?.address||''}/>
        </div>
        <div className="flex gap-2">
          {apartments.length === 0 && (
            <button onClick={()=>setShowGenModal(true)} className={btnPrimary}>
              <Settings size={15}/>Générer appartements
            </button>
          )}
          <Link href={`/real-estate/properties/${propertyId}/apartments/new`} className={btnPrimary}>
            <Plus size={15}/>Ajouter
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
          <p className="text-xs text-blue-600 font-medium">Total</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.available}</p>
          <p className="text-xs text-green-600 font-medium">Disponibles</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{stats.occupied}</p>
          <p className="text-xs text-amber-600 font-medium">Occupés</p>
        </div>
      </div>

      {apartments.length === 0 ? (
        <EmptyState icon={<Home size={24}/>} title="Aucun appartement"
          description="Générez automatiquement les appartements ou ajoutez-les manuellement"
          action={<button onClick={()=>setShowGenModal(true)} className={btnPrimary}><Settings size={15}/>Générer</button>}/>
      ) : (
        <div className="space-y-5">
          {floors.map(floor => (
            <div key={floor} className={cardCls}>
              <div className="px-5 py-3 border-b border-border bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {floor==='RDC'?'RDC':floor.replace('R+','')}
                  </div>
                  <span className="font-semibold text-foreground">{floor}</span>
                  <span className="text-xs text-muted-foreground">· {byFloor[floor].length} appartement(s)</span>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-green-600">{byFloor[floor].filter(a=>a.status==='available').length} libres</span>
                  <span>·</span>
                  <span className="text-amber-600">{byFloor[floor].filter(a=>a.status==='occupied').length} occupés</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {byFloor[floor].map(apt => {
                  const sm = STATUS_MAP[apt.status]||{l:apt.status,v:'default'};
                  return (
                    <Link key={apt.id} href={`/real-estate/properties/${propertyId}/apartments/${apt.id}`}
                      className="border border-border rounded-2xl p-4 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${apt.status==='available'?'bg-green-100 text-green-700':apt.status==='occupied'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                            {apt.name.split(' ').pop()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{apt.name}</p>
                            <p className="text-xs text-muted-foreground">{apt.floor}</p>
                          </div>
                        </div>
                        <Badge variant={sm.v}>{sm.l}</Badge>
                      </div>
                      {apt.tenants && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Users size={11}/>{apt.tenants.first_name} {apt.tenants.last_name}
                        </div>
                      )}
                      {apt.rent_amount && (
                        <p className="text-xs font-semibold text-primary mt-1">{formatCurrency(apt.rent_amount)}/mois</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <h3 className="font-bold text-foreground mb-1">Générer les appartements</h3>
            <p className="text-sm text-muted-foreground mb-4">Pour <strong>{property?.name}</strong></p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={genConfig.hasRDC} onChange={e=>setGenConfig(g=>({...g,hasRDC:e.target.checked}))} className="w-4 h-4 accent-primary"/>
                <label className="text-sm font-medium text-foreground">Inclure le RDC</label>
              </div>
              {genConfig.hasRDC && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Appartements au RDC</label>
                  <input type="number" value={genConfig.rdcApts} min={1} max={8}
                    onChange={e=>setGenConfig(g=>({...g,rdcApts:parseInt(e.target.value)||1}))}
                    className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-background"/>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre d'étages (R+1, R+2...)</label>
                <input type="number" value={genConfig.floors} min={0} max={20}
                  onChange={e=>setGenConfig(g=>({...g,floors:parseInt(e.target.value)||0}))}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-background"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Appartements par étage</label>
                <input type="number" value={genConfig.aptsPerFloor} min={1} max={8}
                  onChange={e=>setGenConfig(g=>({...g,aptsPerFloor:parseInt(e.target.value)||1}))}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-background"/>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Aperçu des noms :</p>
                <div className="flex flex-wrap gap-1.5">
                  {genConfig.hasRDC && ['A','B','C','D'].slice(0,genConfig.rdcApts).map(l=>(
                    <span key={l} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-medium">
                      {property?.name.split(' ')[0].toUpperCase().slice(0,6)} R{l}
                    </span>
                  ))}
                  {Array.from({length:Math.min(genConfig.floors,3)},(_,f)=>f+1).map(f=>
                    ['A','B','C','D'].slice(0,genConfig.aptsPerFloor).map(l=>(
                      <span key={`${f}${l}`} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-medium">
                        {property?.name.split(' ')[0].toUpperCase().slice(0,6)} {f}{l}
                      </span>
                    ))
                  )}
                  {genConfig.floors > 3 && <span className="text-xs text-muted-foreground">...</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total : <strong>{(genConfig.hasRDC?genConfig.rdcApts:0) + genConfig.floors*genConfig.aptsPerFloor}</strong> appartements
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowGenModal(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50">Annuler</button>
                <button onClick={generateApartments} disabled={generating}
                  className={btnPrimary+' flex-1 justify-center'}>
                  {generating?<LoadingSpinner size={14}/>:<Settings size={14}/>}
                  {generating?'Génération...':'Générer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}