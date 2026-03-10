'use client';
import { useAuthStore } from '@/lib/store';
import { PageHeader, cardCls, Badge, BadgeVariant } from '@/components/ui';
import { CheckCircle, XCircle, Lock } from 'lucide-react';

const ROLES = ['super_admin','admin','manager','agent','viewer'];
const ROLE_LABELS: Record<string,{l:string;v:BadgeVariant}> = {
  super_admin:{l:'Super Admin',v:'error'},
  admin:      {l:'Admin',      v:'info'},
  manager:    {l:'Manager',    v:'info'},
  agent:      {l:'Agent',      v:'warning'},
  viewer:     {l:'Viewer',     v:'default'},
};

const PERMISSION_MATRIX: {
  module: string;
  actions: { label: string; perms: Record<string,boolean> }[];
}[] = [
  {
    module: 'Biens immobiliers',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:true}  },
      { label:'Creer',      perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Modifier',   perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Supprimer',  perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
    ],
  },
  {
    module: 'Locataires',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:true}  },
      { label:'Creer',      perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Modifier',   perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Supprimer',  perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
    ],
  },
  {
    module: 'Contrats de bail',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:true}  },
      { label:'Creer',      perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Modifier',   perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Supprimer',  perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
      { label:'Gen. PDF',   perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:true}  },
    ],
  },
  {
    module: 'Paiements de loyer',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:true}  },
      { label:'Enregistrer',perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:false} },
      { label:'Modifier',   perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Supprimer',  perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
      { label:'Quittance',  perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:true}  },
    ],
  },
  {
    module: 'Paiements en ligne',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Initier',    perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
    ],
  },
  {
    module: 'Maintenance',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:true}  },
      { label:'Creer',      perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:false} },
      { label:'Modifier',   perms:{super_admin:true, admin:true, manager:true, agent:true,  viewer:false} },
      { label:'Supprimer',  perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
    ],
  },
  {
    module: 'Depenses',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:true}  },
      { label:'Creer',      perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
      { label:'Supprimer',  perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
    ],
  },
  {
    module: 'Rapports & Stats',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:true}  },
      { label:'Exporter',   perms:{super_admin:true, admin:true, manager:true, agent:false, viewer:false} },
    ],
  },
  {
    module: 'Utilisateurs (entreprise)',
    actions: [
      { label:'Voir',       perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
      { label:'Inviter',    perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
      { label:'Modifier role',perms:{super_admin:true,admin:true,manager:false,agent:false, viewer:false} },
      { label:'Desactiver', perms:{super_admin:true, admin:true, manager:false,agent:false, viewer:false} },
    ],
  },
  {
    module: 'Super Admin (plateforme)',
    actions: [
      { label:'Toutes les entreprises', perms:{super_admin:true,admin:false,manager:false,agent:false,viewer:false} },
      { label:'Gerer les plans',        perms:{super_admin:true,admin:false,manager:false,agent:false,viewer:false} },
      { label:'Gerer tous les users',   perms:{super_admin:true,admin:false,manager:false,agent:false,viewer:false} },
      { label:'Audit logs',             perms:{super_admin:true,admin:false,manager:false,agent:false,viewer:false} },
    ],
  },
];

export default function PermissionsPage() {
  const { user } = useAuthStore();
  if (user?.role !== 'super_admin') return <div className="text-center py-16 text-muted-foreground">Acces refuse</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Matrice des permissions" subtitle="Droits d'acces par role et par fonctionnalite"/>

      <div className={cardCls+' overflow-x-auto'}>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-slate-50 dark:bg-slate-700/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48">Module / Action</th>
              {ROLES.map(r => {
                const rm = ROLE_LABELS[r];
                return (
                  <th key={r} className="px-3 py-3 text-center w-24">
                    <Badge variant={rm.v}>{rm.l}</Badge>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MATRIX.map((section, si) => (
              <>
                {/* Module header */}
                <tr key={'m-'+si} className="bg-slate-50 dark:bg-slate-700/20">
                  <td colSpan={ROLES.length+1} className="px-5 py-2">
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-primary"/>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{section.module}</span>
                    </div>
                  </td>
                </tr>
                {section.actions.map((action, ai) => (
                  <tr key={'a-'+si+'-'+ai} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-700/10 transition-colors">
                    <td className="px-5 py-2.5 text-sm text-muted-foreground pl-9">{action.label}</td>
                    {ROLES.map(r => (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {action.perms[r]
                          ? <CheckCircle size={16} className="text-green-500 mx-auto"/>
                          : <XCircle size={16} className="text-slate-200 dark:text-slate-600 mx-auto"/>}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cardCls+' p-5'}>
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Lock size={15} className="text-primary"/>Implementation</h3>
        <p className="text-sm text-muted-foreground">
          Ces permissions sont appliquees via les politiques RLS (Row Level Security) de Supabase et les guards dans le code Next.js.
          Chaque route API verifie le role de l'utilisateur connecte. Modifiez les roles depuis la page <strong>Utilisateurs</strong>.
        </p>
      </div>
    </div>
  );
}