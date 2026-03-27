'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, Truck, Shield, Car, Wrench, BarChart3,
  Download, Eye, AlertTriangle, CheckCircle, Clock, ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, LoadingSpinner, cardCls, Badge, BadgeVariant } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type VehicleDoc = {
  id: string; type: string; title: string;
  expiry_date: string | null; issue_date: string | null; doc_url: string | null;
  vehicles: { plate: string; type: string } | null;
};
type RecentDelivery = { id: string; reference: string; status: string; created_at: string; logistics_clients: { name: string } | null };
type RecentInvoice  = { id: string; invoice_number: string; status: string; total_ttc: number; created_at: string; client_name: string | null };

const DOC_TYPE_MAP: Record<string, { l: string; icon: React.ReactNode; color: string }> = {
  assurance:          { l: 'Assurance',          icon: <Shield size={14}/>,    color: 'text-blue-600 bg-blue-50'   },
  carte_grise:        { l: 'Carte grise',         icon: <Car size={14}/>,       color: 'text-slate-600 bg-slate-50'  },
  controle_technique: { l: 'Contrôle technique',  icon: <Wrench size={14}/>,    color: 'text-orange-600 bg-orange-50'},
  vignette:           { l: 'Vignette',            icon: <FileText size={14}/>,  color: 'text-green-600 bg-green-50' },
  autre:              { l: 'Autre',               icon: <FileText size={14}/>,  color: 'text-slate-500 bg-slate-50'  },
};

function expiryStatus(expiry: string | null): { label: string; variant: BadgeVariant } {
  if (!expiry) return { label: 'Sans expiration', variant: 'default' };
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: 'Expiré',       variant: 'error'   };
  if (days < 30) return { label: `${days}j`,      variant: 'warning' };
  return { label: formatDate(expiry),              variant: 'success' };
}

export default function DocumentsPage() {
  const { company } = useAuthStore();
  const [vehicleDocs,      setVehicleDocs]      = useState<VehicleDoc[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [recentInvoices,   setRecentInvoices]   = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!company?.id) return;
    setLoading(true);
    const sb = createClient();
    Promise.all([
      sb.from('vehicle_documents')
        .select('id,type,title,expiry_date,issue_date,doc_url,vehicles(plate,type)')
        .eq('company_id', company.id)
        .order('expiry_date', { ascending: true })
        .limit(20),
      sb.from('deliveries')
        .select('id,reference,status,created_at,logistics_clients(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10),
      sb.from('logistics_invoices')
        .select('id,invoice_number,status,total_ttc,created_at,client_name')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]).then(([{ data: vd }, { data: del }, { data: inv }]) => {
      setVehicleDocs((vd || []) as unknown as VehicleDoc[]);
      setRecentDeliveries((del || []) as unknown as RecentDelivery[]);
      setRecentInvoices((inv || []) as unknown as RecentInvoice[]);
      setLoading(false);
    });
  }, [company?.id]);

  const expiredDocs = vehicleDocs.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date());
  const soonDocs    = vehicleDocs.filter(d => {
    if (!d.expiry_date) return false;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days < 30;
  });

  if (loading) return <div className="flex justify-center py-24"><LoadingSpinner size={36}/></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Documents & PDF" subtitle="Gestion centralisée des documents et exports"/>

      {/* Alertes documents */}
      {(expiredDocs.length > 0 || soonDocs.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {expiredDocs.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl">
              <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0"/>
              <div>
                <p className="font-semibold text-red-700 text-sm">{expiredDocs.length} document(s) expiré(s)</p>
                <p className="text-xs text-red-600 mt-0.5">{expiredDocs.map(d => d.vehicles?.plate).join(', ')}</p>
              </div>
            </div>
          )}
          {soonDocs.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-2xl">
              <Clock size={18} className="text-amber-600 mt-0.5 flex-shrink-0"/>
              <div>
                <p className="font-semibold text-amber-700 text-sm">{soonDocs.length} document(s) à renouveler dans 30j</p>
                <p className="text-xs text-amber-600 mt-0.5">{soonDocs.map(d => d.vehicles?.plate).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raccourcis export */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/logistics/stats',    label: 'Rapport statistiques', icon: <BarChart3 size={20}/>, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { href: '/logistics/rapports', label: 'Rapport financier',    icon: <FileText size={20}/>,  color: 'text-green-600 bg-green-50 border-green-100' },
          { href: '/logistics/factures', label: 'Factures clients',     icon: <FileText size={20}/>,  color: 'text-purple-600 bg-purple-50 border-purple-100' },
          { href: '/logistics/fleet',    label: 'Docs véhicules',       icon: <Car size={20}/>,       color: 'text-orange-600 bg-orange-50 border-orange-100' },
        ].map(s => (
          <Link key={s.href} href={s.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center hover:shadow-md transition-all ${s.color}`}>
            {s.icon}
            <span className="text-xs font-semibold">{s.label}</span>
            <ExternalLink size={11} className="opacity-50"/>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Documents véhicules */}
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary"/>
              <h3 className="font-semibold text-foreground">Documents véhicules</h3>
              <Badge variant="default">{vehicleDocs.length}</Badge>
            </div>
            <Link href="/logistics/fleet" className="text-xs text-primary hover:underline">Gérer →</Link>
          </div>
          {vehicleDocs.length === 0
            ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun document enregistré</p>
            : (
              <div className="divide-y divide-border">
                {vehicleDocs.slice(0, 8).map(doc => {
                  const dt = DOC_TYPE_MAP[doc.type] || DOC_TYPE_MAP.autre;
                  const es = expiryStatus(doc.expiry_date);
                  return (
                    <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${dt.color}`}>
                        {dt.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.vehicles?.plate || '—'} · {dt.l}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={es.variant}>{es.label}</Badge>
                        {doc.doc_url && (
                          <a href={doc.doc_url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors">
                            <Download size={13}/>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Bons de livraison */}
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-primary"/>
              <h3 className="font-semibold text-foreground">Bons de livraison</h3>
            </div>
            <Link href="/logistics/deliveries" className="text-xs text-primary hover:underline">Toutes →</Link>
          </div>
          {recentDeliveries.length === 0
            ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune livraison</p>
            : (
              <div className="divide-y divide-border">
                {recentDeliveries.map(d => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{d.reference}</p>
                      <p className="text-xs text-muted-foreground">{d.logistics_clients?.name || 'Client non renseigné'} · {formatDate(d.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={d.status === 'delivered' ? 'success' : d.status === 'failed' ? 'error' : 'info'}>
                        {d.status === 'delivered' ? 'Livré' : d.status === 'pending' ? 'En attente' : d.status === 'in_progress' ? 'En cours' : d.status}
                      </Badge>
                      <Link href={`/logistics/deliveries/${d.id}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors"
                        title="Voir / Imprimer">
                        <Eye size={13}/>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Factures récentes */}
        <div className={cardCls + ' lg:col-span-2'}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-primary"/>
              <h3 className="font-semibold text-foreground">Factures récentes</h3>
            </div>
            <Link href="/logistics/factures" className="text-xs text-primary hover:underline">Toutes →</Link>
          </div>
          {recentInvoices.length === 0
            ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune facture</p>
            : (
              <div className="divide-y divide-border">
                {recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.client_name || '—'} · {formatDate(inv.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">
                        {inv.total_ttc?.toLocaleString('fr-FR')} FCFA
                      </span>
                      <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : inv.status === 'sent' ? 'info' : 'default'}>
                        {inv.status === 'paid' ? 'Payée' : inv.status === 'overdue' ? 'En retard' : inv.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                      </Badge>
                      <Link href={`/logistics/factures/${inv.id}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-blue-50 transition-colors"
                        title="Voir / Imprimer">
                        <Eye size={13}/>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

      </div>

      {/* Info impression */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 rounded-2xl">
        <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0"/>
        <div>
          <p className="text-sm font-semibold text-blue-700">Export PDF</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Pour imprimer un document, ouvre-le via le bouton <Eye size={11} className="inline"/> puis utilise <strong>Ctrl+P</strong> (ou Cmd+P sur Mac) pour générer un PDF.
            Les factures et bons de livraison sont optimisés pour l'impression.
          </p>
        </div>
      </div>
    </div>
  );
}
