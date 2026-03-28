'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Edit2, Phone, Mail, FileText, Star, Truck } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { cardCls, LoadingSpinner } from '@/components/ui';

type Driver = {
  id: string; first_name: string; last_name: string;
  email: string | null; phone: string;
  license_number: string | null; license_expiry: string | null;
  id_card_number: string | null; id_card_expiry: string | null;
  status: string; rating: number | null;
  total_deliveries: number | null; successful_deliveries: number | null;
  notes: string | null; created_at: string;
};

const STATUS_CONFIG: Record<string, { l: string; dot: string }> = {
  available:  { l: 'Disponible', dot: '#16a34a' },
  on_mission: { l: 'En mission', dot: '#2563eb' },
  off:        { l: 'En repos',   dot: '#ea580c' },
  inactive:   { l: 'Inactif',    dot: '#9ca3af' },
};

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

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size={36}/></div>;
  if (!driver) return null;

  const cfg = STATUS_CONFIG[driver.status] || { l: driver.status, dot: '#9ca3af' };
  const fullName = `${driver.first_name} ${driver.last_name}`.trim();
  const successRate = driver.total_deliveries && driver.total_deliveries > 0
    ? Math.round(((driver.successful_deliveries || 0) / driver.total_deliveries) * 100) : 0;
  const licenseExpiringSoon = driver.license_expiry &&
    Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / 86400000) <= 30;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{fullName}</h1>
            <span className="flex items-center gap-1.5 text-xs font-semibold mt-0.5" style={{ color: cfg.dot }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }}/>
              {cfg.l}
            </span>
          </div>
        </div>
        <Link href={`/logistics/drivers/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 transition-colors">
          <Edit2 size={15}/> Modifier
        </Link>
      </div>

      {/* Alerte permis */}
      {licenseExpiringSoon && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <span>Le permis expire le <strong>{formatDate(driver.license_expiry!)}</strong> — pensez a le renouveler.</span>
        </div>
      )}

      {/* Profil */}
      <div className={cardCls + ' p-6'}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-primary"/>
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">{fullName}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {driver.phone && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone size={11}/>{driver.phone}
                </span>
              )}
              {driver.email && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail size={11}/>{driver.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Truck size={11}/> Livraisons
            </p>
            <p className="text-xl font-black text-foreground">{driver.total_deliveries || 0}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs text-muted-foreground mb-1">Taux succes</p>
            <p className="text-xl font-black text-foreground">{successRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
              <Star size={11} className="text-amber-400"/> Note
            </p>
            <p className="text-xl font-black text-foreground">{driver.rating?.toFixed(1) || '5.0'}</p>
          </div>
        </div>

        {/* Documents */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText size={11}/> Documents
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'N° Permis',         value: driver.license_number || '—' },
              { label: 'Expiration permis', value: driver.license_expiry ? formatDate(driver.license_expiry) : '—' },
              { label: 'N° CNI',            value: driver.id_card_number || '—' },
              { label: 'Expiration CNI',    value: driver.id_card_expiry ? formatDate(driver.id_card_expiry) : '—' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {driver.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground">{driver.notes}</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
          Ajoute le {formatDate(driver.created_at)}
        </p>
      </div>
    </div>
  );
}
