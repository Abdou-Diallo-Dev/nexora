'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Edit2, Printer } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { Badge, LoadingSpinner } from '@/components/ui';

type Driver = {
  id: string; full_name: string; email: string; phone: string; license_number: string;
  license_expiry: string; status: string; address: string; notes: string; created_at: string;
};

const printDocument = (html: string) => {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  w.close();
};

const generatePDFContent = (title: string, fields: { label: string; value: string }[]) => `
  <html><head><title>${title}</title>
  <style>body{font-family:sans-serif;padding:32px;color:#1e293b}h1{font-size:20px;margin-bottom:24px}
  .row{display:flex;gap:8px;margin-bottom:12px}.label{font-size:12px;color:#64748b;min-width:160px}.value{font-size:14px;font-weight:500}</style>
  </head><body><h1>${title}</h1>
  ${fields.map(f => `<div class="row"><span class="label">${f.label}</span><span class="value">${f.value}</span></div>`).join('')}
  </body></html>`;

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { company } = useAuthStore();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !company?.id) return;
    createClient().from('drivers').select('*').eq('id', id).eq('company_id', company.id).single()
      .then(({ data }) => {
        if (!data) { router.push('/logistics/drivers'); return; }
        setDriver(data as Driver);
        setLoading(false);
      });
  }, [id, company?.id]);

  const handlePrint = () => {
    if (!driver) return;
    const html = generatePDFContent(`Fiche chauffeur — ${driver.full_name}`, [
      { label: 'Nom complet',       value: driver.full_name },
      { label: 'Email',             value: driver.email },
      { label: 'Téléphone',         value: driver.phone || '—' },
      { label: 'N° permis',         value: driver.license_number || '—' },
      { label: 'Expiration permis', value: driver.license_expiry ? formatDate(driver.license_expiry) : '—' },
      { label: 'Statut',            value: driver.status === 'available' ? 'Disponible' : driver.status === 'on_delivery' ? 'En livraison' : 'Inactif' },
      { label: 'Adresse',           value: driver.address || '—' },
      { label: 'Notes',             value: driver.notes || '—' },
      { label: 'Ajouté le',         value: formatDate(driver.created_at) },
    ]);
    printDocument(html);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36} /></div>;
  if (!driver) return null;

  const licenseExpiringSoon = driver.license_expiry &&
    Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / 86400000) <= 30;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{driver.full_name}</h1>
            <p className="text-sm text-muted-foreground">{driver.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors">
            <Printer size={15} /> Imprimer
          </button>
          <Link href={`/logistics/drivers/${id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 transition-colors">
            <Edit2 size={15} /> Modifier
          </Link>
        </div>
      </div>

      {licenseExpiringSoon && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Le permis de ce chauffeur expire le {formatDate(driver.license_expiry)} — pensez à le renouveler.
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-foreground">{driver.full_name}</p>
              <p className="text-xs text-muted-foreground">{driver.phone || '—'}</p>
            </div>
          </div>
          <Badge variant={driver.status === 'available' ? 'success' : driver.status === 'on_delivery' ? 'purple' : 'error'}>
            {driver.status === 'available' ? 'Disponible' : driver.status === 'on_delivery' ? 'En livraison' : 'Inactif'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Email',             value: driver.email },
            { label: 'Téléphone',         value: driver.phone || '—' },
            { label: 'N° permis',         value: driver.license_number || '—' },
            { label: 'Expiration permis', value: driver.license_expiry ? formatDate(driver.license_expiry) : '—' },
            { label: 'Adresse',           value: driver.address || '—' },
            { label: 'Ajouté le',         value: formatDate(driver.created_at) },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
              <p className="text-sm font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {driver.notes && (
          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground">{driver.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}