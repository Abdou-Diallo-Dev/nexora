'use client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, cardCls, BadgeVariant } from '@/components/ui';
import { Shield, Crown, Star, Zap, Eye, CheckCircle, XCircle } from 'lucide-react';

type Role = {
  id: string; label: string; description: string;
  color: string; icon: React.ReactNode; variant: BadgeVariant;
  permissions: string[];
};

const ROLES: Role[] = [
  {
    id: 'super_admin', label: 'Super Admin', variant: 'error',
    color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: <Crown size={20} className="text-red-600"/>,
    description: 'Acces total a la plateforme. Gere toutes les entreprises, utilisateurs et configurations.',
    permissions: ['all'],
  },
  {
    id: 'admin', label: 'Administrateur', variant: 'info',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: <Shield size={20} className="text-blue-600"/>,
    description: 'Acces complet au sein de son entreprise. Peut gerer les utilisateurs, biens, locataires et finances.',
    permissions: ['companies.read','properties.all','tenants.all','leases.all','payments.all','maintenance.all','users.manage','reports.all'],
  },
  {
    id: 'manager', label: 'Manager', variant: 'info',
    color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
    icon: <Star size={20} className="text-cyan-600"/>,
    description: 'Gere les operations courantes. Peut creer et modifier les biens, locataires, contrats et paiements.',
    permissions: ['properties.all','tenants.all','leases.all','payments.all','maintenance.all','reports.read'],
  },
  {
    id: 'agent', label: 'Agent', variant: 'warning',
    color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: <Zap size={20} className="text-amber-600"/>,
    description: 'Acces operationnel limite. Peut consulter et creer des paiements et tickets de maintenance.',
    permissions: ['properties.read','tenants.read','leases.read','payments.create','payments.read','maintenance.all'],
  },
  {
    id: 'viewer', label: 'Lecteur', variant: 'default',
    color: 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600',
    icon: <Eye size={20} className="text-slate-600"/>,
    description: 'Acces en lecture seule. Peut consulter toutes les donnees sans pouvoir les modifier.',
    permissions: ['properties.read','tenants.read','leases.read','payments.read','maintenance.read','reports.read'],
  },
];

const ALL_PERMISSIONS = [
  { id:'properties.all',    label:'Biens — Lecture + Ecriture' },
  { id:'properties.read',   label:'Biens — Lecture seule' },
  { id:'tenants.all',       label:'Locataires — Lecture + Ecriture' },
  { id:'tenants.read',      label:'Locataires — Lecture seule' },
  { id:'leases.all',        label:'Contrats — Lecture + Ecriture' },
  { id:'leases.read',       label:'Contrats — Lecture seule' },
  { id:'payments.all',      label:'Paiements — Lecture + Ecriture' },
  { id:'payments.create',   label:'Paiements — Creer uniquement' },
  { id:'payments.read',     label:'Paiements — Lecture seule' },
  { id:'maintenance.all',   label:'Maintenance — Lecture + Ecriture' },
  { id:'maintenance.read',  label:'Maintenance — Lecture seule' },
  { id:'reports.all',       label:'Rapports — Lecture + Export' },
  { id:'reports.read',      label:'Rapports — Lecture seule' },
  { id:'users.manage',      label:'Utilisateurs — Gestion complete' },
  { id:'companies.read',    label:'Entreprises — Lecture' },
  { id:'all',               label:'Toutes les permissions' },
];

export default function RolesPage() {
  const { user } = useAuthStore();
  if (user?.role !== 'super_admin') return <div className="text-center py-16 text-muted-foreground">Acces refuse</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Roles et permissions" subtitle="Definition des acces par role sur la plateforme"/>

      <div className="grid grid-cols-1 gap-5">
        {ROLES.map(role => (
          <div key={role.id} className={cardCls+' p-5 border-2 '+role.color}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                {role.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-foreground text-base">{role.label}</h3>
                  <Badge variant={role.variant}>{role.id}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{role.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ALL_PERMISSIONS.map(perm => {
                    const has = role.permissions.includes('all') || role.permissions.includes(perm.id);
                    // Only show permissions that are relevant
                    if (!has && role.permissions.includes('all')) return null;
                    return (
                      <div key={perm.id} className={'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium '+(has?'bg-white dark:bg-slate-800 text-foreground':'bg-transparent text-muted-foreground opacity-40')}>
                        {has
                          ? <CheckCircle size={13} className="text-green-500 flex-shrink-0"/>
                          : <XCircle size={13} className="text-slate-300 flex-shrink-0"/>}
                        <span className="truncate">{perm.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={cardCls+' p-5'}>
        <h3 className="font-semibold text-foreground mb-3">Note</h3>
        <p className="text-sm text-muted-foreground">
          Les roles sont geres au niveau de la base de donnees via Supabase RLS (Row Level Security).
          Pour modifier les permissions d'un utilisateur, changez son role depuis la page Utilisateurs.
          Les roles <strong>super_admin</strong> ne peuvent etre attribues que manuellement en base de donnees.
        </p>
      </div>
    </div>
  );
}