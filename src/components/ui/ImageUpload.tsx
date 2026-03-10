'use client';
import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucket: string;
  folder?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  multiple?: false;
}

interface MultiImageUploadProps {
  bucket: string;
  folder?: string;
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxFiles?: number;
}

const SIZE = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };

export function ImageUpload({ bucket, folder = '', value, onChange, label, shape = 'square', size = 'md' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Fichier image uniquement'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image max 5MB'); return; }
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${folder}/${Date.now()}.${ext}`.replace(/^\//, '');
      const { error } = await createClient().storage.from(bucket).upload(path, file, { upsert: true });
      if (error) { toast.error('Erreur upload'); return; }
      const { data } = createClient().storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Image telechargee !');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!value) return;
    // Extract path from URL
    const path = value.split(`/${bucket}/`)[1];
    if (path) await createClient().storage.from(bucket).remove([path]);
    onChange(null);
  };

  const sizeClass = SIZE[size];
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>}
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className={`${sizeClass} ${shapeClass} border-2 border-dashed border-border bg-slate-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative`}>
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-primary"/>
          ) : value ? (
            <>
              <img src={value} alt="preview" className="w-full h-full object-cover"/>
              <button onClick={remove} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <X size={10} className="text-white"/>
              </button>
            </>
          ) : (
            <ImageIcon size={20} className="text-muted-foreground opacity-40"/>
          )}
        </div>
        {/* Upload button */}
        <div>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
            <Upload size={13}/> {value ? 'Changer' : 'Telecharger'}
          </button>
          <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG, WEBP · max 5MB</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}/>
      </div>
    </div>
  );
}

export function MultiImageUpload({ bucket, folder = '', values, onChange, label, maxFiles = 6 }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    if (values.length + files.length > maxFiles) { toast.error(`Maximum ${maxFiles} images`); return; }
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} trop lourd (max 5MB)`); continue; }
        const ext  = file.name.split('.').pop();
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`.replace(/^\//, '');
        const { error } = await createClient().storage.from(bucket).upload(path, file, { upsert: true });
        if (error) continue;
        const { data } = createClient().storage.from(bucket).getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      onChange([...values, ...newUrls]);
      if (newUrls.length) toast.success(`${newUrls.length} image(s) telechargee(s)`);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (url: string, idx: number) => {
    const path = url.split(`/${bucket}/`)[1];
    if (path) await createClient().storage.from(bucket).remove([path]);
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>}
      <div className="flex flex-wrap gap-3">
        {values.map((url, i) => (
          <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
            <img src={url} alt={`img-${i}`} className="w-full h-full object-cover"/>
            <button onClick={() => remove(url, i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={10} className="text-white"/>
            </button>
          </div>
        ))}
        {values.length < maxFiles && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-slate-50 dark:bg-slate-700 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors disabled:opacity-50">
            {uploading ? <Loader2 size={18} className="animate-spin text-primary"/> : <Upload size={18} className="text-muted-foreground"/>}
            <span className="text-[10px] text-muted-foreground">{uploading ? 'Envoi...' : 'Ajouter'}</span>
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">{values.length}/{maxFiles} images · JPG, PNG, WEBP · max 5MB chacune</p>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) upload(e.target.files); e.target.value = ''; }}/>
    </div>
  );
}