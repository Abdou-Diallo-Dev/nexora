'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

type Property = { id: string; name: string };
type Tenant   = { id: string; first_name: string; last_name: string };

export default function NewMaintenancePage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants]       = useState<Tenant[]>([]);
  const [form, setForm] = useState({
    property_id: '', tenant_id: '', title: '', description: '',
    category: 'other', priority: 'medium', status: 'open',
    scheduled_date: '', estimated_cost: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('properties').select('id,name').eq('company_id', company.id).then(({ data }) => setProperties(data || []));
    sb.from('tenants').select('id,first_name,last_name').eq('company_id', company.id).then(({ data }) => setTenants(data || []));
  }, [company?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    if (!form.title.trim()) { toast.error('Le titre est obligatoire'); return; }
    setLoading(true);
    const { error } = await createClient().from('maintenance_tickets').insert({
      company_id:     company.id,
      property_id:    form.property_id    || null,
      tenant_id:      form.tenant_id      || null,
      title:          form.title.trim(),
      description:    form.description.trim() || 'Aucune description fournie',
      category:       form.category,
      priority:       form.priority,
      status:         form.status,
      scheduled_date: form.scheduled_date || null,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      notes:          form.notes.trim()   || null,
    } as never);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-');
    toast.success('Ticket créé avec succès');
    router.push('/real-estate/maintenance');
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/maintenance" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Nouveau ticket de maintenance" />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="md:col-span-2">
            <label className={labelCls}>Titre *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required
              placeholder="Ex: Fuite robinet salle de bain" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Bien</label>
            <select value={form.property_id} onChange={e => set('property_id', e.target.value)} className={selectCls}>
              <option value="">Sélectionner...</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Locataire</label>
            <select value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)} className={selectCls}>
              <option value="">Sélectionner...</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Catégorie</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={selectCls}>
              {[['plumbing','Plomberie'],['electricity','Électricité'],['hvac','Climatisation'],
                ['structural','Structure'],['appliance','Électroménager'],['pest_control','Nuisibles'],['other','Autre']
              ].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Priorité</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={selectCls}>
              {[['low','Faible'],['medium','Moyen'],['high','Élevé'],['urgent','URGENT']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Date planifiée</label>
            <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Coût estimé (FCFA)</label>
            <input type="number" value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)}
              placeholder="0" className={inputCls} />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Description <span className="text-muted-foreground text-xs">(facultatif)</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="Décrivez le problème en détail..." className={inputCls} />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Notes initiales</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/maintenance" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary + ' gap-2'}>
            {loading ? <LoadingSpinner size={16} /> : <Save size={16} />}Créer le ticket
          </button>
        </div>
      </form>
    </div>
  );
}