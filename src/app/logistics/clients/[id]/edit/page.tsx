'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { LoadingSpinner } from '@/components/ui';

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { company } = useAuthStore();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !company?.id) return;
    const supabase = createClient();
    supabase.from('clients').select('*').eq('id', id).eq('company_id', company.id).single()
      .then(({ data: d }) => {
        if (!d) { router.push('/logistics/clients'); return; }
        setData(d);
        setLoading(false);
      });
  }, [id, company?.id]);

  const handleSave = async () => {
    if (!data || !company?.id) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('clients').update(data).eq('id', id as string);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('Modifications enregistrées');
    router.back();
  };

  const set = (k: string, v: string) => setData(d => d ? { ...d, [k]: v } : null);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36} /></div>;
  if (!data) return null;

  const inputClass = "w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-foreground">Modifier — Client</h1>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6 space-y-4">
        {Object.entries(data).filter(([k]) => !['id','company_id','created_at','updated_at'].includes(k)).map(([key, value]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1 capitalize">{key.replace(/_/g,' ')}</label>
            <input value={String(value ?? '')} onChange={e => set(key, e.target.value)} className={inputClass} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => router.back()} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-medium transition-colors">Annuler</button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin"/>Enregistrement...</> : <><Save size={16}/>Enregistrer</>}
        </button>
      </div>
    </div>
  );
}
