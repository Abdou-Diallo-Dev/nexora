'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, X, Plus, FileText, Download, Edit2, Check, MapPin, Upload, Printer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, Badge, BadgeVariant, cardCls, btnPrimary, inputCls, selectCls, labelCls } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type Report = {
  id:string; type:string; title:string; status:string; content:string|null;
  inspection_date:string; inspector_name:string|null;
  photo_urls:string[]|null; rooms:any[]|null; created_at:string;
  properties:{id:string;name:string;address:string}|null;
  tenants:{first_name:string;last_name:string}|null;
};

const TYPE_MAP: Record<string,{l:string;icon:string;color:string}> = {
  visit:       { l:'Visite terrain',    icon:'🏗️', color:'bg-blue-100 text-blue-700' },
  maintenance: { l:'Suivi travaux',     icon:'🔧', color:'bg-orange-100 text-orange-700' },
  damage:      { l:'Constat',           icon:'⚠️', color:'bg-red-100 text-red-700' },
  entry:       { l:'Etat des lieux E.', icon:'🔑', color:'bg-green-100 text-green-700' },
  exit:        { l:'Etat des lieux S.', icon:'🚪', color:'bg-purple-100 text-purple-700' },
};

const NOTE_BADGE: Record<string,{l:string;v:BadgeVariant}> = {
  bon:     { l:'Bon état',       v:'success' },
  moyen:   { l:'À surveiller',   v:'warning' },
  mauvais: { l:'À traiter',      v:'error' },
};

export default function ReportDetailPage() {
  const { company, user } = useAuthStore();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const isEdit = searchParams?.get('edit') === '1';
  const fileRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<Report|null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(isEdit);
  const [photos, setPhotos] = useState<string[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState({ title:'', content:'', inspector_name:'', inspection_date:'', status:'draft' });

  useEffect(() => {
    if (!id) return;
    createClient().from('property_reports')
      .select('*,properties(id,name,address),tenants(first_name,last_name)')
      .eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReport(data as Report);
          setPhotos(data.photo_urls||[]);
          setRooms(data.rooms||[]);
          setForm({
            title: data.title||'',
            content: data.content||'',
            inspector_name: data.inspector_name||'',
            inspection_date: data.inspection_date||'',
            status: data.status||'draft',
          });
        }
        setLoading(false);
      });
  }, [id]);

  const uploadPhotos = async (files: FileList) => {
    setUploading(true);
    const sb = createClient();
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const fn = `${company?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('property-reports').upload(fn, file, { upsert:true });
      if (!error) {
        const { data:url } = sb.storage.from('property-reports').getPublicUrl(fn);
        if (url?.publicUrl) urls.push(url.publicUrl);
      }
    }
    const newPhotos = [...photos, ...urls];
    setPhotos(newPhotos);
    // Auto-save photos
    await sb.from('property_reports').update({ photo_urls: newPhotos }).eq('id', id);
    setUploading(false);
    toast.success(`${urls.length} photo(s) ajoutée(s)`);
  };

  const removePhoto = async (idx: number) => {
    const newPhotos = photos.filter((_,i)=>i!==idx);
    setPhotos(newPhotos);
    await createClient().from('property_reports').update({ photo_urls: newPhotos }).eq('id', id);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await createClient().from('property_reports').update({
      title: form.title, content: form.content||null,
      inspector_name: form.inspector_name||null,
      inspection_date: form.inspection_date,
      status: form.status, rooms,
    }).eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setReport(prev => prev ? {...prev, ...form, rooms} : prev);
    setEditMode(false);
    toast.success('Rapport mis à jour ✓');
  };

  const exportPDF = async () => {
    if (!report) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p','mm','a4');
      const W = doc.internal.pageSize.getWidth();
      const tm = TYPE_MAP[report.type]||{l:report.type,icon:'📄',color:''};

      // Header
      doc.setFillColor(30,64,175);
      doc.rect(0,0,W,32,'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(14); doc.setFont('helvetica','bold');
      doc.text('Rapport de Terrain', W-8, 12, { align:'right' });
      doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.text(`${tm.l} — ${form.title}`, W-8, 19, { align:'right' });
      doc.setFontSize(8);
      doc.text(company?.name||'Nexora', W-8, 25, { align:'right' });
      doc.text(formatDate(form.inspection_date), 10, 25);

      let y = 40;

      // Info block
      doc.setFillColor(239,246,255);
      doc.roundedRect(10, y, W-20, 20, 3, 3, 'F');
      doc.setTextColor(30,64,175); doc.setFontSize(8); doc.setFont('helvetica','bold');
      doc.text('Bien :', 14, y+7);
      doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
      doc.text(report.properties?.name||'—', 30, y+7);
      doc.setTextColor(30,64,175); doc.setFont('helvetica','bold');
      doc.text('Inspecteur :', 14, y+14);
      doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
      doc.text(form.inspector_name||'—', 40, y+14);
      doc.setTextColor(30,64,175); doc.setFont('helvetica','bold');
      doc.text('Date :', 100, y+7);
      doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
      doc.text(formatDate(form.inspection_date), 115, y+7);
      if (report.tenants) {
        doc.setTextColor(30,64,175); doc.setFont('helvetica','bold');
        doc.text('Locataire :', 100, y+14);
        doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
        doc.text(`${report.tenants.first_name} ${report.tenants.last_name}`, 125, y+14);
      }
      y += 28;

      // Observations
      if (form.content) {
        doc.setFillColor(30,64,175); doc.rect(10, y, 3, 6, 'F');
        doc.setTextColor(30,64,175); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text('Observations generales', 16, y+5);
        y += 12;
        doc.setTextColor(60,60,60); doc.setFontSize(8); doc.setFont('helvetica','normal');
        const lines = doc.splitTextToSize(form.content, W-22);
        doc.text(lines, 12, y);
        y += lines.length * 5 + 8;
      }

      // Rooms
      if (rooms.filter((r:any)=>r.name).length > 0) {
        doc.setFillColor(30,64,175); doc.rect(10, y, 3, 6, 'F');
        doc.setTextColor(30,64,175); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text('Zones inspectees', 16, y+5);
        y += 12;
        rooms.filter((r:any)=>r.name).forEach((room:any, i:number) => {
          if (i%2===0) { doc.setFillColor(248,250,252); doc.rect(10,y,W-20,room.observation?14:8,'F'); }
          const noteColors: Record<string,number[]> = { bon:[22,163,74], moyen:[161,98,7], mauvais:[220,38,38] };
          const nc = noteColors[room.note]||[100,100,100];
          doc.setTextColor(nc[0],nc[1],nc[2]); doc.setFontSize(8); doc.setFont('helvetica','bold');
          doc.text(`[${(room.note||'bon').toUpperCase()}]`, 14, y+5);
          doc.setTextColor(60,60,60); doc.setFont('helvetica','bold');
          doc.text(room.name||'', 35, y+5);
          if (room.observation) {
            doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100); doc.setFontSize(7.5);
            doc.text(room.observation, 14, y+11);
            y += 14;
          } else { y += 8; }
        });
        y += 6;
      }

      // Footer
      doc.setDrawColor(200,200,200); doc.line(10,287,W-10,287);
      doc.setTextColor(150,150,150); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text('Genere par Nexora', 10, 292);
      doc.text(`${photos.length} photo(s) jointe(s)`, W-10, 292, { align:'right' });

      doc.save(`rapport-${report.type}-${form.inspection_date}.pdf`);
      toast.success('PDF exporté ✓');
    } catch(e) { console.error(e); toast.error('Erreur export PDF'); }
  };

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size={32}/></div>;
  if (!report) return <div className="text-center py-16 text-muted-foreground">Rapport introuvable</div>;

  const tm = TYPE_MAP[report.type]||{l:report.type,icon:'📄',color:'bg-slate-100 text-slate-700'};
  const NOTE_COLORS = { bon:'bg-green-100 text-green-700 border-green-200', moyen:'bg-amber-100 text-amber-700 border-amber-200', mauvais:'bg-red-100 text-red-700 border-red-200' };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/real-estate/reports-terrain" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground"><ArrowLeft size={18}/></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${tm.color}`}>{tm.icon} {tm.l}</span>
            {editMode ? (
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className={inputCls+' flex-1 font-bold text-lg'} autoFocus/>
            ) : (
              <h1 className="text-xl font-bold text-foreground">{report.title}</h1>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(form.inspection_date)} · {form.inspector_name||'—'}</p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <button onClick={save} disabled={saving} className={btnPrimary}>
              {saving?<LoadingSpinner size={14}/>:<Check size={14}/>}{saving?'Sauvegarde...':'Enregistrer'}
            </button>
          ) : (
            <button onClick={()=>setEditMode(true)} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-slate-50 transition-colors">
              <Edit2 size={14}/>Modifier
            </button>
          )}
          <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Download size={14}/>PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Observations */}
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><FileText size={14} className="text-primary"/>Observations générales</h3>
            {editMode ? (
              <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))}
                rows={6} placeholder="Observations..." className={inputCls+' resize-none w-full'}/>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{form.content||<span className="text-muted-foreground italic">Aucune observation</span>}</p>
            )}
          </div>

          {/* Zones */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><MapPin size={14} className="text-primary"/>Zones inspectées ({rooms.filter((r:any)=>r.name).length})</h3>
              {editMode && <button onClick={()=>setRooms(prev=>[...prev,{name:'',observation:'',note:'bon'}])} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12}/>Ajouter</button>}
            </div>
            {rooms.filter((r:any)=>r.name||editMode).length===0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune zone renseignée</p>
            ) : rooms.map((room:any, i:number) => (
              editMode ? (
                <div key={i} className="border border-border rounded-xl p-3 space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <input value={room.name} onChange={e=>setRooms(prev=>prev.map((r,ri)=>ri===i?{...r,name:e.target.value}:r))}
                      placeholder="Nom de la zone" className={inputCls+' flex-1 text-sm'}/>
                    <div className="flex gap-1">
                      {(['bon','moyen','mauvais'] as const).map(n=>(
                        <button key={n} onClick={()=>setRooms(prev=>prev.map((r,ri)=>ri===i?{...r,note:n}:r))}
                          className={`px-2 py-1 rounded-lg text-xs font-medium border capitalize ${room.note===n?NOTE_COLORS[n]:'border-border text-muted-foreground'}`}>{n}</button>
                      ))}
                    </div>
                    <button onClick={()=>setRooms(prev=>prev.filter((_,ri)=>ri!==i))} className="text-muted-foreground hover:text-red-500"><X size={13}/></button>
                  </div>
                  <textarea value={room.observation} onChange={e=>setRooms(prev=>prev.map((r,ri)=>ri===i?{...r,observation:e.target.value}:r))}
                    rows={2} placeholder="Observations..." className={inputCls+' resize-none w-full text-sm'}/>
                </div>
              ) : room.name ? (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors border border-border mb-2">
                  <Badge variant={NOTE_BADGE[room.note]?.v||'default'}>{NOTE_BADGE[room.note]?.l||room.note}</Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{room.name}</p>
                    {room.observation && <p className="text-xs text-muted-foreground mt-0.5">{room.observation}</p>}
                  </div>
                </div>
              ) : null
            ))}
          </div>

          {/* Photos */}
          <div className={cardCls+' p-5'}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Camera size={14} className="text-primary"/>Photos ({photos.length})</h3>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-medium hover:bg-primary/20 transition-colors">
                {uploading?<LoadingSpinner size={12}/>:<Upload size={12}/>}{uploading?'Envoi...':'+ Photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" className="hidden"
                onChange={e=>e.target.files&&uploadPhotos(e.target.files)}/>
            </div>
            {photos.length===0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50" onClick={()=>fileRef.current?.click()}>
                <Camera size={28} className="mx-auto mb-2 text-muted-foreground opacity-30"/>
                <p className="text-sm text-muted-foreground">Aucune photo — Ajouter</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p,i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={p} alt="" className="w-full h-full object-cover cursor-pointer" onClick={()=>window.open(p,'_blank')}/>
                    <button onClick={()=>removePhoto(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex shadow-lg">
                      <X size={12}/>
                    </button>
                  </div>
                ))}
                <button onClick={()=>fileRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors">
                  <Plus size={18}/><span className="text-xs mt-1">Ajouter</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className={cardCls+' p-5'}>
            <h3 className="font-semibold text-foreground mb-3 text-sm">Détails</h3>
            <div className="space-y-3">
              {editMode && (
                <>
                  <div><label className={labelCls}>Date</label><input type="date" value={form.inspection_date} onChange={e=>setForm(f=>({...f,inspection_date:e.target.value}))} className={inputCls}/></div>
                  <div><label className={labelCls}>Inspecteur</label><input value={form.inspector_name} onChange={e=>setForm(f=>({...f,inspector_name:e.target.value}))} className={inputCls}/></div>
                  <div><label className={labelCls}>Statut</label>
                    <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className={selectCls+' w-full'}>
                      <option value="draft">Brouillon</option>
                      <option value="completed">Complété</option>
                      <option value="signed">Signé</option>
                    </select>
                  </div>
                </>
              )}
              {!editMode && (
                <>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Statut</span><Badge variant={report.status==='completed'?'success':report.status==='signed'?'info':'default'}>{report.status==='completed'?'Complété':report.status==='signed'?'Signé':'Brouillon'}</Badge></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bien</span><span className="font-medium text-foreground text-right max-w-[60%]">{report.properties?.name||'—'}</span></div>
                  {report.tenants && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Locataire</span><span className="font-medium text-foreground">{report.tenants.first_name} {report.tenants.last_name}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Photos</span><span className="font-medium text-foreground">{photos.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Zones</span><span className="font-medium text-foreground">{rooms.filter((r:any)=>r.name).length}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Résumé état zones */}
          {rooms.filter((r:any)=>r.name).length > 0 && !editMode && (
            <div className={cardCls+' p-5'}>
              <h3 className="font-semibold text-foreground mb-3 text-sm">📊 Bilan</h3>
              {[
                { label:'✅ Bon état', count:rooms.filter((r:any)=>r.note==='bon'&&r.name).length, color:'text-green-600 bg-green-50', bar:'bg-green-500' },
                { label:'⚠️ À surveiller', count:rooms.filter((r:any)=>r.note==='moyen'&&r.name).length, color:'text-amber-600 bg-amber-50', bar:'bg-amber-500' },
                { label:'❌ À traiter', count:rooms.filter((r:any)=>r.note==='mauvais'&&r.name).length, color:'text-red-600 bg-red-50', bar:'bg-red-500' },
              ].map(s=>{
                const total = rooms.filter((r:any)=>r.name).length;
                const pct = total>0?Math.round((s.count/total)*100):0;
                return (
                  <div key={s.label} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-medium ${s.color.split(' ')[0]}`}>{s.label}</span>
                      <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className={`h-1.5 rounded-full ${s.bar}`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}