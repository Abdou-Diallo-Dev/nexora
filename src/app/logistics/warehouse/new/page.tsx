'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader } from '@/components/ui';
import { inventorySchema, InventoryInput } from '@/lib/validations';

export default function NewInventoryPage() {
  const router = useRouter();
  const { company } = useAuthStore();
  const [loading, setLoading] = useState(false);

 type FormValues = {
  sku: string; name: string; description?: string; category?: string;
  quantity: number; min_quantity: number; unit: string; location?: string;
  unit_cost: number; notes?: string;
};
const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(inventorySchema) as any,
  defaultValues: { quantity: 0, min_quantity: 0, unit_cost: 0, unit: 'unité' },
});

  const onSubmit = async (data: InventoryInput) => {
    if (!company?.id) return;
    const supabase = createClient();
    setLoading(true);
    try {
      const { error } = await supabase.from('inventory').insert({ ...data, company_id: company.id });
      if (error) throw error;
      toast.success('Article ajouté à l\'inventaire');
      router.push('/logistics/warehouse');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      if (msg.includes('unique')) toast.error('Ce SKU existe déjà');
      else toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Nouvel article" actions={<Link href="/logistics/warehouse" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-foreground rounded-xl text-sm font-medium transition-colors"><ArrowLeft size={16} /> Retour</Link>} />

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Nom de l&apos;article <span className="text-error">*</span></label>
              <input {...register('name')} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Boîte carton standard" />
              {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">SKU <span className="text-error">*</span></label>
              <input {...register('sku')} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono uppercase" placeholder="BOX-001" />
              {errors.sku && <p className="text-error text-xs mt-1">{errors.sku.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Catégorie</label>
              <input {...register('category')} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Emballage" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Quantité initiale</label>
              <input {...register('quantity', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Stock minimum</label>
              <input {...register('min_quantity', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Unité</label>
              <select {...register('unit')} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all">
                <option value="unité">Unité</option>
                <option value="kg">Kilogramme</option>
                <option value="g">Gramme</option>
                <option value="l">Litre</option>
                <option value="m">Mètre</option>
                <option value="m²">Mètre carré</option>
                <option value="boîte">Boîte</option>
                <option value="palette">Palette</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Coût unitaire (€)</label>
              <input {...register('unit_cost', { valueAsNumber: true })} type="number" step="0.01" min="0" className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Emplacement</label>
              <input {...register('location')} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Allée A - Rayon 3" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea {...register('description')} rows={3} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none" placeholder="Description de l'article..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Link href="/logistics/warehouse" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-foreground rounded-xl text-sm font-medium transition-colors">Annuler</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Ajouter l&apos;article
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
