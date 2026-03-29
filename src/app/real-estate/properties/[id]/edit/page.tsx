'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, inputCls, selectCls, labelCls, btnPrimary, btnSecondary, cardCls } from '@/components/ui';
import { toast } from 'sonner';
import { qc } from '@/lib/cache';

const EMPTY = {
  name: '', address: '', city: '', zip_code: '', country: 'Senegal',
  type: 'apartment', status: 'available',
  rent_amount: '', charges_amount: '0', surface_area: '', rooms_count: '',
  owner_name: '', owner_email: '', owner_phone: '', description: '',
  lot_number: '', parcel_number: '', lotissement_name: '',
};

export default function PropertyEditPage() {
  const { company } = useAuthStore();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!rawId) return;
    createClient().from('properties').select('*').eq('id', rawId).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as Record<string, unknown>;
        const meta = (d.metadata as Record<string, string>) || {};
        setForm({
          ...Object.fromEntries(Object.keys(EMPTY).map(k => [k, d[k]?.toString() ?? ''])) as typeof EMPTY,
          lot_number: meta.lot_number || '',
          parcel_number: meta.parcel_number || '',
          lotissement_name: meta.lotissement_name || '',
        });
      }
      setFetching(false);
    });
  }, [rawId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setLoading(true);
    const landMeta = form.type === 'land'
      ? { lot_number: form.lot_number, parcel_number: form.parcel_number, lotissement_name: form.lotissement_name }
      : {};
    const payload = {
      ...form,
      rent_amount: Number(form.rent_amount),
      charges_amount: Number(form.charges_amount),
      surface_area: form.surface_area ? Number(form.surface_area) : null,
      rooms_count: form.rooms_count ? Number(form.rooms_count) : null,
      company_id: company.id,
      metadata: landMeta,
    };
    const { error } = await createClient().from('properties').update(payload as never).eq('id', rawId!);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    qc.bust('re-');
    toast.success('Bien modifie');
    router.push('/real-estate/properties');
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={32} /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/real-estate/properties" className={btnSecondary + ' !px-3'}><ArrowLeft size={16} /></Link>
        <PageHeader title="Modifier le bien" />
      </div>
      <form onSubmit={submit} className={cardCls + ' p-6'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="md:col-span-2">
            <label className={labelCls}>Nom du bien *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Ex: Villa Fann" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Adresse *</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} required placeholder="Rue, numero" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ville *</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} required placeholder="Dakar" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="10000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Pays</label>
            <input value={form.country} onChange={e => set('country', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Surface (m2)</label>
            <input type="number" value={form.surface_area} onChange={e => set('surface_area', e.target.value)} placeholder="80" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nombre de pieces</label>
            <input type="number" value={form.rooms_count} onChange={e => set('rooms_count', e.target.value)} placeholder="3" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Loyer mensuel (FCFA) *</label>
            <input type="number" value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} required placeholder="250000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Charges (FCFA)</label>
            <input type="number" value={form.charges_amount} onChange={e => set('charges_amount', e.target.value)} placeholder="0" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className={selectCls}>
              <option value="apartment">Appartement</option>
              <option value="studio">Studio</option>
              <option value="villa">Villa</option>
              <option value="commercial">Local commercial</option>
              <option value="office">Bureau</option>
              <option value="warehouse">Entrepot</option>
              <option value="land">Terrain / Lotissement</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
              <option value="available">Disponible</option>
              <option value="rented">Loue</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>

          {form.type === 'land' && (
            <>
              <div>
                <label className={labelCls}>Nom du lotissement</label>
                <input value={form.lotissement_name} onChange={e => set('lotissement_name', e.target.value)} placeholder="Ex: Cite Aliou Sow" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>N de lot</label>
                <input value={form.lot_number} onChange={e => set('lot_number', e.target.value)} placeholder="Ex: LOT 12" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>N de parcelle</label>
                <input value={form.parcel_number} onChange={e => set('parcel_number', e.target.value)} placeholder="Ex: PARC-2024-008" className={inputCls} />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Nom du proprietaire</label>
            <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Optionnel" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email proprietaire</label>
            <input type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} placeholder="Optionnel" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telephone proprietaire</label>
            <input value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} placeholder="+221 77 000 00 00" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputCls as string} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Link href="/real-estate/properties" className={btnSecondary}>Annuler</Link>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? <LoadingSpinner size={16} /> : <Save size={16} />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
