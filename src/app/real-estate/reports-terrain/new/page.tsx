'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, X, Plus, FileText, MapPin, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, labelCls, selectCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';

type Property = { id:string; name:string };
type Tenant = { id:string; first_name:string; last_name:string };

const TYPE_MAP = [
  { v:'visit',       l:'🏗️ Visite terrain / chantier' },
  { v:'maintenance', l:'🔧 Suivi travaux / finitions' },
  { v:'damage',      l:'⚠️ Constat de dégradation' },
  { v:'entry',       l:'🔑 État des lieux entrée' },
  { v:'exit',        l:'🚪 État des lieux sortie' },
];

type Room = { name:string; observation:string; note:'bon'|'moyen'|'mauvais' };

export default function NewReportPage() {
  const { company, user } = useAuthStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>([{ name:'Salon', observation:'', note:'bon' }]);

  const [form, setForm] = useState({
    type:'visit', title:'', property_id:'', tenant_id:'',
    content:'', inspector_name: user?.full_name||'',
    inspection_date: new Date().toISOString().split('T')[0],
    status:'draft',
  });
  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('properties').select('id,name').eq('company_id',company.id).order('name').then(({data})=>setProperties((data||[]) as Property[]));
    sb.from('tenants').select('id,first_name,last_name').eq('company_id',company.id).order('first_name').then(({data})=>setTenants((data||[]) as Tenant[]));
  }, [company?.id]);

  const uploadPhotos = async (files: FileList) => {
    setUploading(true);
    const sb = createClient();
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const fileName = `${company?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('property-reports').upload(fileName, file, { upsert:true });
      if (!error) {
        const { data:url } = sb.storage.from('property-reports').getPublicUrl(fileName);
        if (url?.publicUrl) urls.push(url.publicUrl);
      }
    }
    setPhotos(prev => [...prev, ...urls]);
    setUploading(false);
    toast.success(`${urls.length} photo(s) ajoutée(s)`);
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_,i)=>i!==idx));

  const addRoom = () => setRooms(prev => [...prev, { name:'', observation:'', note:'bon' }]);
  const updateRoom = (i:number, k:keyof Room, v:string) => setRooms(prev => prev.map((r,ri)=>ri===i?{...r,[k]:v}:r));
  const removeRoom = (i:number) => setRooms(prev => prev.filter((_,ri)=>ri!==i));

  const save = async (status='draft') => {
    if (!form.title) { toast.error('Titre requis'); return; }
    setSaving(true);
    const { error, data } = await createClient().from('property_reports').insert({
      company_id: company!.id,
      property_id: form.property_id||null,
      tenant_id: form.tenant_id||null,
      type: form.type, title: form.title,
      content: form.content||null,
      rooms: rooms.filter(r=>r.name),
      photo_urls: photos,
      inspector_name: form.inspector_name||null,
      inspection_date: form.inspection_date,
      status, created_by: user?.id,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(status==='completed'?'Rapport complété ✓':'Brouillon sauvegardé');
    router.push(`/real-estate/reports-terrain/${(data as any).id}`);
  };

  const NOTE_COLORS = { bon:'bg-green-100 text-green-700 border-green-200', moyen:'bg-amber-100 text-amber-700 border-amber-200', mauvais:'bg-red-100 text-red-700 border-red-200' };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/reports-terrain" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <PageHeader title="Nouveau rapport de terrain" subtitle="Visite, chantier, constat"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">

          {/* Infos générales */}
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><FileText size={15} className="text-primary"/>Informations générales</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Type de rapport *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {TYPE_MAP.map(t => (
                    <button key={t.v} onClick={()=>set('type',t.v)}
                      className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${form.type===t.v?'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary font-medium':'border-border hover:border-primary/40 text-muted-foreground'}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Titre du rapport *</label>
                <input value={form.title} onChange={e=>set('title',e.target.value)}
                  placeholder="Ex: Visite chantier Villa Rose - Finitions peinture"
                  className={inputCls}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date d'inspection</label>
                  <input type="date" value={form.inspection_date} onChange={e=>set('inspection_date',e.target.value)} className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>Inspecteur</label>
                  <input value={form.inspector_name} onChange={e=>set('inspector_name',e.target.value)} placeholder="Nom de l'agent" className={inputCls}/>
                </div>
              </div>
            </div>
          </div>

          {/* Observations générales */}
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3">📝 Observations générales</h3>
            <textarea value={form.content} onChange={e=>set('content',e.target.value)}
              placeholder="Décrivez l'état général, les travaux en cours, les remarques importantes, les actions à prendre..."
              rows={6} className={inputCls+' resize-none w-full'}/>
          </div>

          {/* Pièces / Zones */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><MapPin size={15} className="text-primary"/>Pièces / Zones inspectées</h3>
              <button onClick={addRoom} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <Plus size={13}/>Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {rooms.map((room, i) => (
                <div key={i} className="border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={room.name} onChange={e=>updateRoom(i,'name',e.target.value)}
                      placeholder="Ex: Salon, Chambre 1, Façade nord..."
                      className={inputCls+' flex-1 text-sm'}/>
                    <div className="flex gap-1">
                      {(['bon','moyen','mauvais'] as const).map(n => (
                        <button key={n} onClick={()=>updateRoom(i,'note',n)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all capitalize ${room.note===n?NOTE_COLORS[n]:'border-border text-muted-foreground hover:border-primary/40'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <button onClick={()=>removeRoom(i)} className="p-1 text-muted-foreground hover:text-red-500"><X size={14}/></button>
                  </div>
                  <textarea value={room.observation} onChange={e=>updateRoom(i,'observation',e.target.value)}
                    placeholder="Observations pour cette zone..."
                    rows={2} className={inputCls+' resize-none w-full text-sm'}/>
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Camera size={15} className="text-primary"/>Photos</h3>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-medium hover:bg-primary/20 transition-colors">
                {uploading?<LoadingSpinner size={12}/>:<Upload size={13}/>}
                {uploading?'Envoi...':'Ajouter photos'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e=>e.target.files&&uploadPhotos(e.target.files)}/>
            </div>
            {photos.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={()=>fileRef.current?.click()}>
                <Camera size={32} className="mx-auto mb-2 text-muted-foreground opacity-40"/>
                <p className="text-sm text-muted-foreground">Cliquez ou prenez des photos</p>
                <p className="text-xs text-muted-foreground mt-1">Depuis votre téléphone ou ordinateur</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p,i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={p} alt="" className="w-full h-full object-cover"/>
                    <button onClick={()=>removePhoto(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex transition-all shadow-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ))}
                <button onClick={()=>fileRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  <Plus size={20}/>
                  <span className="text-xs mt-1">Ajouter</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Bien + Locataire */}
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3 text-sm">🏠 Bien concerné</h3>
            <select value={form.property_id} onChange={e=>set('property_id',e.target.value)} className={selectCls+' w-full'}>
              <option value="">— Choisir un bien —</option>
              {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3 text-sm">👤 Locataire concerné</h3>
            <select value={form.tenant_id} onChange={e=>set('tenant_id',e.target.value)} className={selectCls+' w-full'}>
              <option value="">— Optionnel —</option>
              {tenants.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>

          {/* Résumé zones */}
          {rooms.filter(r=>r.name).length > 0 && (
            <div className={cardCls+' p-5'}>
              <h3 className="font-semibold text-foreground mb-3 text-sm">📊 Résumé zones</h3>
              <div className="space-y-1.5">
                {[
                  { label:'✅ Bon état', count:rooms.filter(r=>r.note==='bon'&&r.name).length, color:'text-green-600' },
                  { label:'⚠️ À surveiller', count:rooms.filter(r=>r.note==='moyen'&&r.name).length, color:'text-amber-600' },
                  { label:'❌ À traiter', count:rooms.filter(r=>r.note==='mauvais'&&r.name).length, color:'text-red-600' },
                ].map(s=>(
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button onClick={()=>save('completed')} disabled={saving}
              className={btnPrimary+' w-full justify-center py-3'}>
              {saving?<LoadingSpinner size={15}/>:<FileText size={15}/>}
              {saving?'Sauvegarde...':'Valider le rapport'}
            </button>
            <button onClick={()=>save('draft')} disabled={saving}
              className="w-full py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              Sauvegarder brouillon
            </button>
            <Link href="/real-estate/reports-terrain" className="block text-center py-2.5 text-sm text-muted-foreground hover:text-foreground">
              Annuler
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}