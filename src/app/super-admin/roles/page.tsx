'use client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, cardCls, BadgeVariant } from '@/components/ui';
import { Shield, Crown, Star, Zap, Eye, CheckCircle, XCircle, Briefcase, LineChart } from 'lucide-react';

const SARPA_PURPLE = '#3d2674';
const SARPA_YELLOW = '#faab2d';

type Role = {
  id: string; label: string; description: string;
  bg: string; border: string; iconBg: string; iconColor: string;
  variant: BadgeVariant; icon: React.ReactNode;
  permissions: string[];
};

const ROLES: Role[] = [
  {
    id: 'super_admin', label: 'Super Admin', variant: 'error',
    bg: 'rgba(250,171,45,0.08)', border: 'rgba(250,171,45,0.35)',
    iconBg: 'rgba(250,171,45,0.18)', iconColor: '#7c5200',
    icon: <Crown size={20}/>,
    description: 'Accès total à la plateforme. Gère toutes les filiales, utilisateurs et configurations.',
    permissions: ['all'],
  },
  {
    id: 'admin', label: 'Administrateur', variant: 'info',
    bg: 'rgba(61,38,116,0.07)', border: 'rgba(61,38,116,0.22)',
    iconBg: 'rgba(61,38,116,0.14)', iconColor: SARPA_PURPLE,
    icon: <Shield size={20}/>,
    description: 'Accès complet au sein de sa filiale. Peut gérer les utilisateurs, biens, locataires et finances.',
    permissions: ['companies.read','properties.all','tenants.all','leases.all','payments.all','maintenance.all','users.manage','reports.all'],
  },
  {
    id: 'manager', label: 'Manager', variant: 'info',
    bg: 'rgba(61,38,116,0.05)', border: 'rgba(61,38,116,0.15)',
    iconBg: 'rgba(61,38,116,0.10)', iconColor: SARPA_PURPLE,
    icon: <Star size={20}/>,
    description: 'Gère les opérations courantes. Peut créer et modifier les biens, locataires, contrats et paiements.',
    permissions: ['properties.all','tenants.all','leases.all','payments.all','maintenance.all','reports.read'],
  },
  {
    id: 'agent', label: 'Agent', variant: 'warning',
    bg: 'rgba(250,171,45,0.06)', border: 'rgba(250,171,45,0.22)',
    iconBg: 'rgba(250,171,45,0.15)', iconColor: '#7c5200',
    icon: <Zap size={20}/>,
    description: 'Accès opérationnel limité. Peut consulter et créer des paiements et tickets de maintenance.',
    permissions: ['properties.read','tenants.read','leases.read','payments.create','payments.read','maintenance.all'],
  },
  {
    id: 'viewer', label: 'Lecteur', variant: 'default',
    bg: 'rgba(100,116,139,0.05)', border: 'rgba(100,116,139,0.18)',
    iconBg: 'rgba(100,116,139,0.10)', iconColor: '#475569',
    icon: <Eye size={20}/>,
    description: 'Accès en lecture seule. Peut consulter toutes les données sans pouvoir les modifier.',
    permissions: ['properties.read','tenants.read','leases.read','payments.read','maintenance.read','reports.read'],
  },
  {
    id: 'pdg', label: 'PDG', variant: 'warning',
    bg: 'rgba(250,171,45,0.08)', border: 'rgba(250,171,45,0.28)',
    iconBg: 'rgba(250,171,45,0.20)', iconColor: '#7c5200',
    icon: <Briefcase size={20}/>,
    description: 'Vue executive lecture seule. Accès limité au tableau de bord, aux statistiques et aux rapports financiers.',
    permissions: ['reports.read'],
  },
  {
    id: 'responsable_operations', label: 'Resp. Opérations', variant: 'info',
    bg: 'rgba(61,38,116,0.05)', border: 'rgba(61,38,116,0.14)',
    iconBg: 'rgba(61,38,116,0.10)', iconColor: SARPA_PURPLE,
    icon: <LineChart size={20}/>,
    description: 'Suivi opérationnel lecture seule. Consulte les indicateurs, les analyses et les rapports.',
    permissions: ['reports.read'],
  },
];

const ALL_PERMISSIONS = [
  { id:'properties.all',    label:'Biens — Lecture + Écriture' },
  { id:'properties.read',   label:'Biens — Lecture seule' },
  { id:'tenants.all',       label:'Locataires — Lecture + Écriture' },
  { id:'tenants.read',      label:'Locataires — Lecture seule' },
  { id:'leases.all',        label:'Contrats — Lecture + Écriture' },
  { id:'leases.read',       label:'Contrats — Lecture seule' },
  { id:'payments.all',      label:'Paiements — Lecture + Écriture' },
  { id:'payments.create',   label:'Paiements — Créer uniquement' },
  { id:'payments.read',     label:'Paiements — Lecture seule' },
  { id:'maintenance.all',   label:'Maintenance — Lecture + Écriture' },
  { id:'maintenance.read',  label:'Maintenance — Lecture seule' },
  { id:'reports.all',       label:'Rapports — Lecture + Export' },
  { id:'reports.read',      label:'Rapports — Lecture seule' },
  { id:'users.manage',      label:'Utilisateurs — Gestion complète' },
  { id:'companies.read',    label:'Filiales — Lecture' },
  { id:'all',               label:'Toutes les permissions' },
];

export default function RolesPage() {
  const { user } = useAuthStore();
  if (user?.role !== 'super_admin') return <div className="text-center py-16 text-muted-foreground">Accès refusé</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Rôles & permissions" subtitle="Définition des accès par rôle sur la plateforme"/>

      <div className="grid grid-cols-1 gap-4">
        {ROLES.map(role => (
          <div key={role.id} className={cardCls+' p-5 border-2'}
            style={{ background: role.bg, borderColor: role.border }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ background: role.iconBg, color: role.iconColor }}>
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
                    if (!has && role.permissions.includes('all')) return null;
                    return (
                      <div key={perm.id} className={'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium '+(has?'bg-white dark:bg-slate-800 text-foreground':'bg-transparent text-muted-foreground opacity-40')}>
                        {has
                          ? <CheckCircle size={13} className="flex-shrink-0" style={{ color: '#22c55e' }}/>
                          : <XCircle size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0"/>}
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

      <div className={cardCls+' p-5'}>
        <h3 className="font-semibold text-foreground mb-2">Note</h3>
        <p className="text-sm text-muted-foreground">
          Les rôles sont gérés au niveau de la base de données via Supabase RLS (Row Level Security).
          Pour modifier les permissions d'un utilisateur, changez son rôle depuis la page Utilisateurs.
          Les rôles <strong>super_admin</strong> ne peuvent être attribués que manuellement.
        </p>
      </div>
    </div>
  );
}
