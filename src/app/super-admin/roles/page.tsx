'use client';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { PageHeader, Badge, cardCls } from '@/components/ui';
import {
  Shield, Crown, Star, Zap, Eye, CheckCircle, XCircle,
  Briefcase, LineChart, Truck, Factory, Building2,
  Calculator, UserCog, ShoppingCart, Hammer, FlaskConical,
  Globe, Users,
} from 'lucide-react';

const NX_BLUE   = '#1e40af';
const NX_LIGHT  = '#3b82f6';
const NX_ACCENT = '#93c5fd';

type AccessLevel = 'full' | 'partial' | 'readonly';
type Module = 'global' | 'real_estate' | 'logistics' | 'beton';

type RoleDef = {
  id: string;
  label: string;
  description: string;
  module: Module;
  accessLevel: AccessLevel;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  cardBg: string;
  cardBorder: string;
  permissions: string[];
};

// ─── CONFIG VISUELLE ──────────────────────────────────────────
const ACCESS_BADGE: Record<AccessLevel, { label: string; bg: string; color: string }> = {
  full:     { label: 'Accès complet', bg: 'rgba(34,197,94,0.12)',    color: '#15803d' },
  partial:  { label: 'Accès partiel', bg: 'rgba(30,64,175,0.10)',    color: NX_BLUE },
  readonly: { label: 'Lecture seule', bg: 'rgba(147,197,253,0.15)',   color: '#1e3a8a' },
};

const MODULE_BADGE: Record<Module, { label: string; bg: string; color: string }> = {
  global:      { label: 'Groupe',      bg: 'rgba(147,197,253,0.18)', color: '#1e3a8a' },
  real_estate: { label: 'Immobilier',  bg: 'rgba(30,64,175,0.10)',  color: NX_BLUE },
  logistics:   { label: 'Logistique',  bg: 'rgba(20,184,166,0.12)', color: '#0f766e' },
  beton:       { label: 'Béton',       bg: 'rgba(249,115,22,0.12)', color: '#c2410c' },
};

// ─── CATALOGUE COMPLET DES RÔLES ──────────────────────────────
const ROLES: RoleDef[] = [
  // ── SUPER ADMIN ──────────────────────────────────────────────
  {
    id: 'super_admin', label: 'Super Administrateur', module: 'global', accessLevel: 'full',
    description: 'Contrôle total de la plateforme. Crée, modifie et supprime utilisateurs, rôles, filiales et modules. Accède aux logs système et paramètres globaux.',
    icon: <Crown size={20}/>,
    iconBg: 'rgba(147,197,253,0.20)', iconColor: '#1e3a8a',
    cardBg: 'rgba(147,197,253,0.06)', cardBorder: 'rgba(147,197,253,0.35)',
    permissions: ['Toutes les filiales', 'Gestion utilisateurs', 'Gestion rôles', 'Gestion modules', 'Logs système', 'Paramètres globaux', 'Toutes les données'],
  },
  // ── DIRECTION SARPA GROUP ─────────────────────────────────────
  {
    id: 'pdg', label: 'PDG', module: 'global', accessLevel: 'readonly',
    description: 'Président Directeur Général. Vue executive consolidée sur toutes les filiales : tableau de bord, statistiques et rapports financiers.',
    icon: <Briefcase size={20}/>,
    iconBg: 'rgba(147,197,253,0.18)', iconColor: '#1e3a8a',
    cardBg: 'rgba(147,197,253,0.05)', cardBorder: 'rgba(147,197,253,0.25)',
    permissions: ['Toutes filiales (lecture)', 'Tableau de bord consolidé', 'Statistiques globales', 'Rapports financiers', 'Analytics groupe'],
  },
  {
    id: 'directeur_operations', label: 'Directeur des Opérations & Logistique', module: 'global', accessLevel: 'full',
    description: 'Accès complet à toutes les filiales. Supervise les opérations logistique, béton et immobilier. Peut gérer les utilisateurs.',
    icon: <LineChart size={20}/>,
    iconBg: 'rgba(30,64,175,0.15)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.05)', cardBorder: 'rgba(30,64,175,0.20)',
    permissions: ['Toutes filiales', 'Gestion utilisateurs', 'Opérations complètes', 'Finance & rapports', 'Analytics global'],
  },
  {
    id: 'directeur_financier', label: 'Directeur Administratif & Financier', module: 'global', accessLevel: 'partial',
    description: 'Accès complet aux finances, paiements, dépenses et factures de toutes les filiales. Lecture seule sur les autres données.',
    icon: <Calculator size={20}/>,
    iconBg: 'rgba(30,64,175,0.15)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.05)', cardBorder: 'rgba(30,64,175,0.18)',
    permissions: ['Toutes filiales (lecture)', 'Paiements (écriture)', 'Dépenses (écriture)', 'Factures (écriture)', 'Rapports financiers', 'Analytics global'],
  },
  {
    id: 'directeur_juridique', label: 'Directeur Juridique & RH', module: 'global', accessLevel: 'partial',
    description: 'Gestion des contrats, baux, ressources humaines et conformité. Accès complet aux contrats et locataires. Lecture sur les finances.',
    icon: <Shield size={20}/>,
    iconBg: 'rgba(30,64,175,0.15)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.05)', cardBorder: 'rgba(30,64,175,0.18)',
    permissions: ['Toutes filiales (lecture)', 'Contrats & baux (écriture)', 'Locataires (écriture)', 'Gestion utilisateurs', 'Modèles de contrat', 'Rapports'],
  },
  {
    id: 'coordinatrice', label: 'Coordinatrice Générale', module: 'global', accessLevel: 'partial',
    description: 'Coordination transversale de toutes les filiales. Accès opérationnel large : locataires, paiements, contrats, tickets et messagerie.',
    icon: <Globe size={20}/>,
    iconBg: 'rgba(30,64,175,0.12)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.04)', cardBorder: 'rgba(30,64,175,0.15)',
    permissions: ['Toutes filiales (lecture)', 'Locataires (écriture)', 'Paiements (écriture)', 'Contrats (écriture)', 'Tickets maintenance', 'Messagerie locataires'],
  },
  // ── MODULE IMMOBILIER ─────────────────────────────────────────
  {
    id: 'admin', label: 'Administrateur', module: 'real_estate', accessLevel: 'full',
    description: 'Accès complet au sein de sa filiale. Gère utilisateurs, biens, locataires, contrats, paiements et finances.',
    icon: <Shield size={20}/>,
    iconBg: 'rgba(30,64,175,0.14)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.05)', cardBorder: 'rgba(30,64,175,0.20)',
    permissions: ['Biens (écriture)', 'Locataires (écriture)', 'Contrats (écriture)', 'Paiements (écriture)', 'Finance complète', 'Gestion utilisateurs', 'Paramètres filiale'],
  },
  {
    id: 'manager', label: 'Manager', module: 'real_estate', accessLevel: 'partial',
    description: 'Gestion opérationnelle quotidienne. Crée et modifie biens, locataires, contrats et paiements. Accès aux analyses et statistiques.',
    icon: <Star size={20}/>,
    iconBg: 'rgba(30,64,175,0.12)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.04)', cardBorder: 'rgba(30,64,175,0.15)',
    permissions: ['Biens (écriture)', 'Locataires (écriture)', 'Contrats (écriture)', 'Paiements (écriture)', 'Dépenses (lecture)', 'Statistiques', 'Messagerie'],
  },
  {
    id: 'comptable', label: 'Comptable', module: 'real_estate', accessLevel: 'partial',
    description: 'Finance, factures, dépenses et rapports. Accès complet aux données financières. Aucune gestion des biens ni des locataires.',
    icon: <Calculator size={20}/>,
    iconBg: 'rgba(30,64,175,0.12)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.04)', cardBorder: 'rgba(30,64,175,0.15)',
    permissions: ['Paiements (écriture)', 'Dépenses (écriture)', 'Factures (écriture)', 'Rapports financiers', 'Analytics', 'Paiement en ligne'],
  },
  {
    id: 'agent', label: 'Agent Terrain', module: 'real_estate', accessLevel: 'partial',
    description: 'Accès opérationnel limité. Enregistre des paiements, crée des tickets de maintenance, consulte les données.',
    icon: <Zap size={20}/>,
    iconBg: 'rgba(147,197,253,0.15)', iconColor: '#1e3a8a',
    cardBg: 'rgba(147,197,253,0.04)', cardBorder: 'rgba(147,197,253,0.20)',
    permissions: ['Paiements (créer)', 'Tickets maintenance', 'Biens (lecture)', 'Locataires (lecture)', 'Messagerie'],
  },
  {
    id: 'responsable_operations', label: 'Resp. Opérations', module: 'real_estate', accessLevel: 'readonly',
    description: 'Suivi opérationnel en lecture seule. Consulte les indicateurs, analyses et rapports. Aucune modification.',
    icon: <LineChart size={20}/>,
    iconBg: 'rgba(30,64,175,0.10)', iconColor: NX_BLUE,
    cardBg: 'rgba(30,64,175,0.03)', cardBorder: 'rgba(30,64,175,0.12)',
    permissions: ['Rapports (lecture)', 'Analytics (lecture)', 'Statistiques (lecture)'],
  },
  {
    id: 'viewer', label: 'Lecteur', module: 'real_estate', accessLevel: 'readonly',
    description: 'Accès en lecture seule sur toutes les données de la filiale. Aucune modification possible.',
    icon: <Eye size={20}/>,
    iconBg: 'rgba(100,116,139,0.10)', iconColor: '#475569',
    cardBg: 'rgba(100,116,139,0.04)', cardBorder: 'rgba(100,116,139,0.18)',
    permissions: ['Biens (lecture)', 'Locataires (lecture)', 'Contrats (lecture)', 'Paiements (lecture)', 'Statistiques'],
  },
  // ── MODULE LOGISTIQUE ─────────────────────────────────────────
  {
    id: 'manager_logistique', label: 'Manager Logistique', module: 'logistics', accessLevel: 'full',
    description: 'Accès complet au module logistique. Gère livraisons, commandes, flotte, chauffeurs, stock et finances.',
    icon: <Truck size={20}/>,
    iconBg: 'rgba(20,184,166,0.15)', iconColor: '#0f766e',
    cardBg: 'rgba(20,184,166,0.04)', cardBorder: 'rgba(20,184,166,0.20)',
    permissions: ['Livraisons (écriture)', 'Commandes (écriture)', 'Flotte (écriture)', 'Chauffeurs (écriture)', 'Stock (écriture)', 'Finance complète', 'Gestion utilisateurs'],
  },
  {
    id: 'caissiere', label: 'Caissière', module: 'logistics', accessLevel: 'partial',
    description: 'Gestion de la caisse et des paiements. Enregistre les encaissements, dépenses et factures.',
    icon: <Calculator size={20}/>,
    iconBg: 'rgba(20,184,166,0.12)', iconColor: '#0f766e',
    cardBg: 'rgba(20,184,166,0.03)', cardBorder: 'rgba(20,184,166,0.16)',
    permissions: ['Paiements (écriture)', 'Dépenses (lecture)', 'Factures (créer)', 'Statistiques'],
  },
  {
    id: 'responsable_vente', label: 'Responsable Vente', module: 'logistics', accessLevel: 'partial',
    description: 'Gestion commerciale. Traite les commandes, gère les clients, émet les factures et suit les performances.',
    icon: <ShoppingCart size={20}/>,
    iconBg: 'rgba(20,184,166,0.12)', iconColor: '#0f766e',
    cardBg: 'rgba(20,184,166,0.03)', cardBorder: 'rgba(20,184,166,0.16)',
    permissions: ['Commandes (écriture)', 'Clients (écriture)', 'Livraisons (lecture)', 'Factures (créer)', 'Rapports', 'Analytics'],
  },
  {
    id: 'assistante_admin', label: 'Assistante Administrative', module: 'logistics', accessLevel: 'partial',
    description: 'Support administratif. Saisie des données, suivi des dossiers, gestion de la messagerie et consultation des états.',
    icon: <UserCog size={20}/>,
    iconBg: 'rgba(20,184,166,0.10)', iconColor: '#0f766e',
    cardBg: 'rgba(20,184,166,0.03)', cardBorder: 'rgba(20,184,166,0.14)',
    permissions: ['Clients (écriture)', 'Paiements (créer)', 'Documents (lecture)', 'Messagerie', 'Statistiques'],
  },
  // ── MODULE BÉTON ──────────────────────────────────────────────
  {
    id: 'manager_beton', label: 'Manager Béton', module: 'beton', accessLevel: 'full',
    description: 'Accès complet au module béton. Gère production, qualité, stock, commandes, flotte, livraisons et finances.',
    icon: <Factory size={20}/>,
    iconBg: 'rgba(249,115,22,0.15)', iconColor: '#c2410c',
    cardBg: 'rgba(249,115,22,0.04)', cardBorder: 'rgba(249,115,22,0.22)',
    permissions: ['Production (écriture)', 'Qualité (écriture)', 'Stock (écriture)', 'Commandes (écriture)', 'Flotte (écriture)', 'Finance complète', 'Gestion utilisateurs'],
  },
  {
    id: 'responsable_production', label: 'Responsable Production', module: 'beton', accessLevel: 'partial',
    description: 'Supervision de la production et du planning. Gère les coulées, le planning et les rapports de production.',
    icon: <Hammer size={20}/>,
    iconBg: 'rgba(249,115,22,0.12)', iconColor: '#c2410c',
    cardBg: 'rgba(249,115,22,0.03)', cardBorder: 'rgba(249,115,22,0.18)',
    permissions: ['Production (écriture)', 'Planning (écriture)', 'Qualité (écriture)', 'Stock (lecture)', 'Livraisons (lecture)', 'Rapports', 'Maintenance'],
  },
  {
    id: 'operateur_centrale', label: 'Opérateur Centrale', module: 'beton', accessLevel: 'partial',
    description: 'Opérations quotidiennes de production. Saisit les coulées, gère les tickets de maintenance et consulte le planning.',
    icon: <Building2 size={20}/>,
    iconBg: 'rgba(249,115,22,0.10)', iconColor: '#c2410c',
    cardBg: 'rgba(249,115,22,0.03)', cardBorder: 'rgba(249,115,22,0.14)',
    permissions: ['Saisie production', 'Tickets maintenance', 'Planning (lecture)', 'Statistiques'],
  },
  {
    id: 'assistante_commerciale', label: 'Assistante Commerciale', module: 'beton', accessLevel: 'partial',
    description: 'Gestion commerciale et administrative. Traite les commandes, gère les clients, émet les devis et factures.',
    icon: <Users size={20}/>,
    iconBg: 'rgba(249,115,22,0.10)', iconColor: '#c2410c',
    cardBg: 'rgba(249,115,22,0.03)', cardBorder: 'rgba(249,115,22,0.14)',
    permissions: ['Commandes (écriture)', 'Clients (écriture)', 'Factures (créer)', 'Paiements (lecture)', 'Messagerie'],
  },
  {
    id: 'responsable_qualite', label: 'Responsable Qualité', module: 'beton', accessLevel: 'partial',
    description: 'Contrôle qualité et conformité. Valide les productions, génère les rapports de conformité et gère les non-conformités.',
    icon: <FlaskConical size={20}/>,
    iconBg: 'rgba(249,115,22,0.10)', iconColor: '#c2410c',
    cardBg: 'rgba(249,115,22,0.03)', cardBorder: 'rgba(249,115,22,0.14)',
    permissions: ['Contrôle qualité (écriture)', 'Rapports conformité (créer)', 'Non-conformités', 'Analytics', 'Statistiques'],
  },
];

const TABS = [
  { id: 'all',         label: 'Tous',         count: ROLES.length },
  { id: 'global',      label: 'Direction',     count: ROLES.filter(r => r.module === 'global').length },
  { id: 'real_estate', label: 'Immobilier',    count: ROLES.filter(r => r.module === 'real_estate').length },
  { id: 'logistics',   label: 'Logistique',    count: ROLES.filter(r => r.module === 'logistics').length },
  { id: 'beton',       label: 'Béton',         count: ROLES.filter(r => r.module === 'beton').length },
];

const SECTION_HEADERS: Partial<Record<Module | 'super_admin', { label: string; color: string; borderColor: string }>> = {
  global: {
    label: 'Direction Nexora',
    color: NX_ACCENT,
    borderColor: 'rgba(147,197,253,0.30)',
  },
  real_estate: {
    label: 'Module Immobilier',
    color: NX_BLUE,
    borderColor: 'rgba(30,64,175,0.25)',
  },
  logistics: {
    label: 'Module Logistique',
    color: '#0f766e',
    borderColor: 'rgba(20,184,166,0.28)',
  },
  beton: {
    label: 'Module Béton',
    color: '#c2410c',
    borderColor: 'rgba(249,115,22,0.28)',
  },
};

function RoleCard({ role }: { role: RoleDef }) {
  const access = ACCESS_BADGE[role.accessLevel];
  const mod    = MODULE_BADGE[role.module];

  return (
    <div className={cardCls + ' p-5 border-2 transition-shadow hover:shadow-md'}
      style={{ background: role.cardBg, borderColor: role.cardBorder }}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ background: role.iconBg, color: role.iconColor }}>
          {role.icon}
        </div>
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground text-sm">{role.label}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border"
              style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)', background: 'var(--background)' }}>
              {role.id}
            </span>
          </div>
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: mod.bg, color: mod.color }}>
              {mod.label}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: access.bg, color: access.color }}>
              {access.label}
            </span>
          </div>
          {/* Description */}
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{role.description}</p>
          {/* Permissions */}
          <div className="flex flex-wrap gap-1.5">
            {role.permissions.map(perm => (
              <div key={perm} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--foreground)', backdropFilter: 'blur(4px)' }}>
                <CheckCircle size={10} style={{ color: '#22c55e', flexShrink: 0 }}/>
                {perm}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all');

  if (user?.role !== 'super_admin') {
    return <div className="text-center py-16 text-muted-foreground">Accès refusé</div>;
  }

  const filtered = activeTab === 'all' ? ROLES : ROLES.filter(r => r.module === activeTab);

  // Group by module for display
  const grouped = filtered.reduce<Record<string, RoleDef[]>>((acc, role) => {
    const key = role.id === 'super_admin' ? 'super_admin' : role.module;
    if (!acc[key]) acc[key] = [];
    acc[key].push(role);
    return acc;
  }, {});

  const groupOrder = activeTab === 'all'
    ? ['super_admin', 'global', 'real_estate', 'logistics', 'beton']
    : [activeTab === 'global' ? 'global' : activeTab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles & Permissions"
        subtitle="Systeme de roles — Direction, Immobilier, Logistique & Beton"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total rôles',   value: ROLES.length,                                      bg: 'rgba(30,64,175,0.08)',  color: NX_BLUE },
          { label: 'Direction',     value: ROLES.filter(r => r.module === 'global').length,    bg: 'rgba(147,197,253,0.10)', color: '#1e3a8a' },
          { label: 'Opérationnels', value: ROLES.filter(r => r.module !== 'global').length,   bg: 'rgba(30,64,175,0.06)',  color: NX_BLUE },
          { label: 'Accès complet', value: ROLES.filter(r => r.accessLevel === 'full').length, bg: 'rgba(34,197,94,0.08)',  color: '#15803d' },
        ].map(s => (
          <div key={s.label} className={cardCls + ' px-4 py-3'} style={{ background: s.bg }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={active
                ? { background: NX_BLUE, color: '#fff' }
                : { background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
              }>
              {tab.label}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={active
                  ? { background: 'rgba(255,255,255,0.20)', color: '#fff' }
                  : { background: 'rgba(30,64,175,0.08)', color: NX_BLUE }
                }>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Role groups */}
      {groupOrder.map(groupKey => {
        const roles = grouped[groupKey];
        if (!roles || roles.length === 0) return null;
        const section = groupKey === 'super_admin'
          ? { label: 'Super Administration', color: NX_ACCENT, borderColor: 'rgba(147,197,253,0.40)' }
          : SECTION_HEADERS[groupKey as Module];

        return (
          <div key={groupKey}>
            {/* Section header */}
            {activeTab === 'all' && section && (
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1" style={{ background: section.borderColor }}/>
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ color: section.color, background: `${section.borderColor}`, border: `1px solid ${section.borderColor}` }}>
                  {section.label}
                </span>
                <div className="h-px flex-1" style={{ background: section.borderColor }}/>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {roles.map(role => <RoleCard key={role.id} role={role}/>)}
            </div>
          </div>
        );
      })}

      {/* Note */}
      <div className={cardCls + ' p-5'}>
        <h3 className="font-semibold text-foreground mb-2">Note technique</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Les rôles sont stockés dans l'enum <code className="text-xs bg-muted px-1 py-0.5 rounded">user_role</code> de
          Supabase et les permissions dans la table <code className="text-xs bg-muted px-1 py-0.5 rounded">role_templates</code>.
          Les rôles <strong>Direction</strong> ont accès à toutes les filiales du groupe.
          Les rôles <strong>Opérationnels</strong> sont scoped à leur filiale via RLS.
          Le rôle <strong>super_admin</strong> ne peut être attribué que manuellement via Supabase.
        </p>
      </div>
    </div>
  );
}
