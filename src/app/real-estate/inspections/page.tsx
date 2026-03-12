'use client';
import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, FileDown, Camera, X, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner, btnPrimary, btnSecondary, inputCls, labelCls, cardCls } from '@/components/ui';
import { generateInspectionPDF } from '@/lib/pdf';
import type { InspectionRoom, InspectionPhoto } from '@/lib/pdf';

type Tenant   = { id: string; first_name: string; last_name: string };
type Property = { id: string; name: string; address: string; city: string };

const CONDITIONS = ['Bon état', 'Moyen', 'Mauvais'];
const CONDITION_COLORS: Record<string, string> = {
  'Bon état': 'bg-green-100 text-green-700 border-green-300',
  'Moyen':    'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Mauvais':  'bg-red-100 text-red-700 border-red-300',
};
const DEFAULT_ROOMS = ['Entrée', 'Salon', 'Cuisine', 'Chambre 1', 'Salle de bain', 'WC'];

type CompanySettings = {
  name: string;
  logo_url?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  primary_color?: string | null;
};

export default function InspectionsPage() {
  const { company } = useAuthStore();
  const [type, setType]               = useState<'entree' | 'sortie'>('entree');
  const [tenants, setTenants]         = useState<Tenant[]>([]);
  const [properties, setProperties]   = useState<Property[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [form, setForm]               = useState({
    tenantId: '', propertyId: '', date: new Date().toISOString().split('T')[0], observations: '',
  });
  const [rooms, setRooms]   = useState<InspectionRoom[]>(
    DEFAULT_ROOMS.map(name => ({ name, condition: 'Bon état', observations: '' }))
  );
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    Promise.all([
      sb.from('tenants').select('id,first_name,last_name').eq('company_id', company.id).order('first_name'),
      sb.from('properties').select('id,name,address,city').eq('company_id', company.id).order('name'),
      sb.from('companies').select('name,logo_url,address,email,phone,primary_color').eq('id', company.id).maybeSingle(),
    ]).then(([{ data: t }, { data: p }, { data: c }]) => {
      setTenants(t || []);
      setProperties(p || []);
      setCompanySettings(c);
      setLoading(false);
    });
  }, [company?.id]);

  const addRoom    = () => setRooms(r => [...r, { name: '', condition: 'Bon état', observations: '' }]);
  const removeRoom = (i: number) => setRooms(r => r.filter((_, idx) => idx !== i));
  const updateRoom = (i: number, key: keyof InspectionRoom, val: string) =>
    setRooms(r => r.map((room, idx) => idx === i ? { ...room, [key]: val } : room));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setPhotos(p => [...p, { data: base64, format: file.type.includes('png') ? 'PNG' : 'JPEG', caption: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!form.tenantId)   { toast.error('Sélectionnez un locataire'); return; }
    if (!form.propertyId) { toast.error('Sélectionnez un bien'); return; }
    if (rooms.some(r => !r.name.trim())) { toast.error('Remplissez le nom de toutes les pièces'); return; }
    const tenant   = tenants.find(t => t.id === form.tenantId);
    const property = properties.find(p => p.id === form.propertyId);
    setGenerating(true);
    try {
      await generateInspectionPDF({
        type,
        tenantName:      `${tenant?.first_name} ${tenant?.last_name}`,
        propertyName:    property?.name || '',
        propertyAddress: `${property?.address}, ${property?.city}`,
        date: new Date(form.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }),
        rooms,
        observations:    form.observations,
        photos:          photos.length > 0 ? photos : undefined,
        companyName:     companySettings?.name || company?.name || '',
        companyLogoUrl:  companySettings?.logo_url,
        primaryColor:    companySettings?.primary_color || null,
        companyAddress:  companySettings?.address,
        companyEmail:    companySettings?.email,
        companyPhone:    companySettings?.phone,
      });
      toast.success('PDF généré avec succès');
    } catch { toast.error('Erreur génération PDF'); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32}/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <ClipboardCheck size={20} className="text-primary"/>
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">État des lieux</h1>
          <p className="text-sm text-muted-foreground">Générez des états des lieux d'entrée et de sortie professionnels</p>
        </div>
      </div>

      {/* Type toggle */}
      <div className={cardCls + ' p-4'}>
        <div className="flex gap-3">
          {(['entree', 'sortie'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={'flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-2 ' + (
                type === t ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'border-border text-muted-foreground hover:border-primary/40'
              )}>
              {t === 'entree' ? '🔑 État des lieux d\'entrée' : '🚪 État des lieux de sortie'}
            </button>
          ))}
        </div>
      </div>

      {/* Infos générales */}
      <div className={cardCls + ' p-6 space-y-4'}>
        <h2 className="font-bold text-foreground text-base">Informations générales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Locataire *</label>
            <select value={form.tenantId} onChange={e => setForm(f => ({...f, tenantId: e.target.value}))} className={inputCls}>
              <option value="">Sélectionner...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Bien immobilier *</label>
            <select value={form.propertyId} onChange={e => setForm(f => ({...f, propertyId: e.target.value}))} className={inputCls}>
              <option value="">Sélectionner...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className={inputCls}/>
          </div>
        </div>
      </div>

      {/* Pièces */}
      <div className={cardCls + ' p-6 space-y-4'}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-base">Pièces et équipements</h2>
          <button onClick={addRoom} className={btnSecondary + ' gap-1.5 text-xs'}>
            <Plus size={14}/> Ajouter une pièce
          </button>
        </div>
        <div className="space-y-3">
          {rooms.map((room, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <input value={room.name} onChange={e => updateRoom(i, 'name', e.target.value)}
                  placeholder="Nom de la pièce" className={inputCls + ' flex-1 min-w-[120px]'}/>
                <div className="flex gap-1.5 flex-wrap">
                  {CONDITIONS.map(c => (
                    <button key={c} onClick={() => updateRoom(i, 'condition', c)}
                      className={'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ' + (
                        room.condition === c ? CONDITION_COLORS[c] : 'border-border text-muted-foreground hover:border-slate-300'
                      )}>
                      {c}
                    </button>
                  ))}
                </div>
                <button onClick={() => removeRoom(i)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                  <Trash2 size={15}/>
                </button>
              </div>
              <input value={room.observations} onChange={e => updateRoom(i, 'observations', e.target.value)}
                placeholder="Observations..." className={inputCls}/>
            </div>
          ))}
        </div>
      </div>

      {/* Observations générales */}
      <div className={cardCls + ' p-6 space-y-3'}>
        <h2 className="font-bold text-foreground text-base">Observations générales</h2>
        <textarea value={form.observations} onChange={e => setForm(f => ({...f, observations: e.target.value}))}
          rows={3} placeholder="Remarques générales sur l'état du bien..."
          className={inputCls + ' resize-none'}/>
      </div>

      {/* Photos */}
      <div className={cardCls + ' p-6 space-y-4'}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-base">Photos</h2>
          <button onClick={() => fileRef.current?.click()} className={btnSecondary + ' gap-1.5 text-xs'}>
            <Camera size={14}/> Ajouter des photos
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden"/>
        </div>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative group">
                <img src={`data:image/${photo.format.toLowerCase()};base64,${photo.data}`} alt={photo.caption}
                  className="w-full h-24 object-cover rounded-xl"/>
                <button onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex">
                  <X size={12}/>
                </button>
                <p className="text-[10px] text-muted-foreground truncate mt-1">{photo.caption}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune photo ajoutée</p>
        )}
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={handleGenerate} disabled={generating} className={btnPrimary + ' gap-2 px-8'}>
          {generating ? <LoadingSpinner size={16}/> : <FileDown size={16}/>}
          Générer le PDF
        </button>
      </div>
    </div>
  );
}