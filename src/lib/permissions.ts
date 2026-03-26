import { UserRole } from './store';

// ─── PERMISSIONS PAR DEFAUT (fallback si pas de config en DB) ─
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  // ── Direction SARPA GROUP ────────────────────────────────────
  directeur_operations: {
    createProperty: true, editProperty: true, deleteProperty: true,
    createTenant: true, editTenant: true, deleteTenant: true,
    createLease: true, editLease: true, deleteLease: true,
    createPayment: true, editPayment: true, deletePayment: true, viewPayments: true,
    onlinePayment: true,
    createTicket: true, editTicket: true, deleteTicket: true,
    viewExpenses: true, createExpense: true, deleteExpense: true,
    viewInvoices: true, createInvoice: true, deleteInvoice: true,
    viewReports: true, createReport: true,
    viewAnalytics: true, viewStats: true,
    manageUsers: true,
    viewDocuments: true, editContracts: true,
    viewMessages: true, manageTenantPortal: true,
  },
  directeur_financier: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: true, editPayment: true, deletePayment: true, viewPayments: true,
    onlinePayment: true,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: true, createExpense: true, deleteExpense: true,
    viewInvoices: true, createInvoice: true, deleteInvoice: true,
    viewReports: true, createReport: true,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  directeur_juridique: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: true, editTenant: true, deleteTenant: false,
    createLease: true, editLease: true, deleteLease: true,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: true, createInvoice: false, deleteInvoice: false,
    viewReports: true, createReport: false,
    viewAnalytics: true, viewStats: true,
    manageUsers: true,
    viewDocuments: true, editContracts: true,
    viewMessages: false, manageTenantPortal: false,
  },
  coordinatrice: {
    createProperty: false, editProperty: true, deleteProperty: false,
    createTenant: true, editTenant: true, deleteTenant: false,
    createLease: true, editLease: true, deleteLease: false,
    createPayment: true, editPayment: true, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: true, editTicket: true, deleteTicket: false,
    viewExpenses: true, createExpense: false, deleteExpense: false,
    viewInvoices: true, createInvoice: false, deleteInvoice: false,
    viewReports: true, createReport: false,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: true, manageTenantPortal: true,
  },
  // ── Module Logistique ────────────────────────────────────────
  manager_logistique: {
    createProperty: true, editProperty: true, deleteProperty: true,
    createTenant: true, editTenant: true, deleteTenant: true,
    createLease: true, editLease: true, deleteLease: true,
    createPayment: true, editPayment: true, deletePayment: true, viewPayments: true,
    onlinePayment: true,
    createTicket: true, editTicket: true, deleteTicket: true,
    viewExpenses: true, createExpense: true, deleteExpense: true,
    viewInvoices: true, createInvoice: true, deleteInvoice: true,
    viewReports: true, createReport: true,
    viewAnalytics: true, viewStats: true,
    manageUsers: true,
    viewDocuments: true, editContracts: true,
    viewMessages: true, manageTenantPortal: true,
  },
  caissiere: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: true, editPayment: true, deletePayment: false, viewPayments: true,
    onlinePayment: true,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: true, createExpense: true, deleteExpense: false,
    viewInvoices: true, createInvoice: true, deleteInvoice: false,
    viewReports: false, createReport: false,
    viewAnalytics: false, viewStats: true,
    manageUsers: false,
    viewDocuments: false, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  responsable_vente: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: true, editTenant: true, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: true, createInvoice: true, deleteInvoice: false,
    viewReports: true, createReport: false,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: true, manageTenantPortal: false,
  },
  assistante_admin: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: true, editTenant: true, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: true, editPayment: false, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: true, editTicket: true, deleteTicket: false,
    viewExpenses: true, createExpense: false, deleteExpense: false,
    viewInvoices: true, createInvoice: false, deleteInvoice: false,
    viewReports: false, createReport: false,
    viewAnalytics: false, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: true, manageTenantPortal: false,
  },
  // ── Module Béton ─────────────────────────────────────────────
  manager_beton: {
    createProperty: true, editProperty: true, deleteProperty: true,
    createTenant: true, editTenant: true, deleteTenant: true,
    createLease: true, editLease: true, deleteLease: true,
    createPayment: true, editPayment: true, deletePayment: true, viewPayments: true,
    onlinePayment: true,
    createTicket: true, editTicket: true, deleteTicket: true,
    viewExpenses: true, createExpense: true, deleteExpense: true,
    viewInvoices: true, createInvoice: true, deleteInvoice: true,
    viewReports: true, createReport: true,
    viewAnalytics: true, viewStats: true,
    manageUsers: true,
    viewDocuments: true, editContracts: true,
    viewMessages: true, manageTenantPortal: true,
  },
  responsable_production: {
    createProperty: true, editProperty: true, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: true, editTicket: true, deleteTicket: true,
    viewExpenses: true, createExpense: true, deleteExpense: false,
    viewInvoices: false, createInvoice: false, deleteInvoice: false,
    viewReports: true, createReport: true,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  operateur_centrale: {
    createProperty: false, editProperty: true, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: false,
    onlinePayment: false,
    createTicket: true, editTicket: true, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: false, createInvoice: false, deleteInvoice: false,
    viewReports: false, createReport: false,
    viewAnalytics: false, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  assistante_commerciale: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: true, editTenant: true, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: true, createInvoice: true, deleteInvoice: false,
    viewReports: false, createReport: false,
    viewAnalytics: false, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: true, manageTenantPortal: false,
  },
  responsable_qualite: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: false,
    onlinePayment: false,
    createTicket: true, editTicket: true, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: false, createInvoice: false, deleteInvoice: false,
    viewReports: true, createReport: true,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  // ── Module Immobilier ────────────────────────────────────────
  manager: {
    createProperty: true, editProperty: true, deleteProperty: false,
    createTenant: true, editTenant: true, deleteTenant: false,
    createLease: true, editLease: true, deleteLease: false,
    createPayment: true, editPayment: true, deletePayment: false, viewPayments: true,
    onlinePayment: true,
    createTicket: true, editTicket: true, deleteTicket: true,
    viewExpenses: true, createExpense: true, deleteExpense: false,
    viewInvoices: true, createInvoice: false, deleteInvoice: false,
    viewReports: false, createReport: false,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: true,
    viewMessages: true, manageTenantPortal: true,
  },
  agent: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: true, editPayment: false, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: true, editTicket: true, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: false, createInvoice: false, deleteInvoice: false,
    viewReports: false, createReport: false,
    viewAnalytics: false, viewStats: false,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: true, manageTenantPortal: false,
  },
  comptable: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: true, editPayment: true, deletePayment: true, viewPayments: true,
    onlinePayment: true,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: true, createExpense: true, deleteExpense: true,
    viewInvoices: true, createInvoice: true, deleteInvoice: true,
    viewReports: true, createReport: true,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  viewer: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: true,
    onlinePayment: false,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: true, createExpense: false, deleteExpense: false,
    viewInvoices: false, createInvoice: false, deleteInvoice: false,
    viewReports: false, createReport: false,
    viewAnalytics: false, viewStats: true,
    manageUsers: false,
    viewDocuments: true, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  pdg: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: false,
    onlinePayment: false,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: false, createInvoice: false, deleteInvoice: false,
    viewReports: true, createReport: false,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: false, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
  responsable_operations: {
    createProperty: false, editProperty: false, deleteProperty: false,
    createTenant: false, editTenant: false, deleteTenant: false,
    createLease: false, editLease: false, deleteLease: false,
    createPayment: false, editPayment: false, deletePayment: false, viewPayments: false,
    onlinePayment: false,
    createTicket: false, editTicket: false, deleteTicket: false,
    viewExpenses: false, createExpense: false, deleteExpense: false,
    viewInvoices: false, createInvoice: false, deleteInvoice: false,
    viewReports: true, createReport: false,
    viewAnalytics: true, viewStats: true,
    manageUsers: false,
    viewDocuments: false, editContracts: false,
    viewMessages: false, manageTenantPortal: false,
  },
};

// Admin a toujours tout
const ADMIN_PERMISSIONS: Record<string, boolean> = Object.keys(DEFAULT_PERMISSIONS.manager)
  .reduce((acc, key) => ({ ...acc, [key]: true }), {});

// Cache en mémoire des permissions chargées depuis la DB
let _cachedPermissions: Record<string, Record<string, boolean>> | null = null;
let _cacheCompanyId: string | null = null;

export function setCachedPermissions(companyId: string, perms: Record<string, Record<string, boolean>>) {
  _cachedPermissions = perms;
  _cacheCompanyId = companyId;
}

export function getCachedPermissions() {
  return _cachedPermissions;
}

// Direction SARPA GROUP — accès global lecture seule (+ directeur_operations full)
export const DIRECTION_ROLES: UserRole[] = [
  'pdg', 'directeur_operations', 'directeur_financier', 'directeur_juridique', 'coordinatrice',
];
// Rôles qui ne voient que analytics/stats/reports
export const EXECUTIVE_ROLES: UserRole[] = ['pdg', 'responsable_operations'];
export const EXECUTIVE_ALLOWED_ROUTES = ['/real-estate', '/real-estate/analytics', '/real-estate/stats', '/real-estate/reports'];
// Rôles spécifiques logistique
export const LOGISTICS_ROLES: UserRole[] = ['manager_logistique', 'caissiere', 'responsable_vente', 'assistante_admin'];
// Rôles spécifiques béton
export const BETON_ROLES: UserRole[] = ['manager_beton', 'responsable_production', 'operateur_centrale', 'assistante_commerciale', 'responsable_qualite'];

export function isExecutiveRole(role: UserRole) {
  return EXECUTIVE_ROLES.includes(role);
}
export function isDirectionRole(role: UserRole) {
  return DIRECTION_ROLES.includes(role);
}
export function isLogisticsRole(role: UserRole) {
  return LOGISTICS_ROLES.includes(role);
}
export function isBetonRole(role: UserRole) {
  return BETON_ROLES.includes(role);
}

const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'super_admin', 'directeur_operations', 'manager_logistique', 'manager_beton'];

function getPerms(role: UserRole): Record<string, boolean> {
  if (FULL_ACCESS_ROLES.includes(role)) return ADMIN_PERMISSIONS;
  if (_cachedPermissions?.[role]) return _cachedPermissions[role];
  return DEFAULT_PERMISSIONS[role] || {};
}

// ─── API PERMISSIONS ──────────────────────────────────────────
export const can = {
  createProperty:     (role: UserRole) => role === 'admin' || !!getPerms(role).createProperty,
  editProperty:       (role: UserRole) => role === 'admin' || !!getPerms(role).editProperty,
  deleteProperty:     (role: UserRole) => role === 'admin' || !!getPerms(role).deleteProperty,
  createTenant:       (role: UserRole) => role === 'admin' || !!getPerms(role).createTenant,
  editTenant:         (role: UserRole) => role === 'admin' || !!getPerms(role).editTenant,
  deleteTenant:       (role: UserRole) => role === 'admin' || !!getPerms(role).deleteTenant,
  createLease:        (role: UserRole) => role === 'admin' || !!getPerms(role).createLease,
  editLease:          (role: UserRole) => role === 'admin' || !!getPerms(role).editLease,
  deleteLease:        (role: UserRole) => role === 'admin' || !!getPerms(role).deleteLease,
  createPayment:      (role: UserRole) => role === 'admin' || !!getPerms(role).createPayment,
  editPayment:        (role: UserRole) => role === 'admin' || !!getPerms(role).editPayment,
  deletePayment:      (role: UserRole) => role === 'admin' || !!getPerms(role).deletePayment,
  viewPayments:       (role: UserRole) => role === 'admin' || !!getPerms(role).viewPayments,
  onlinePayment:      (role: UserRole) => role === 'admin' || !!getPerms(role).onlinePayment,
  createTicket:       (role: UserRole) => role === 'admin' || !!getPerms(role).createTicket,
  editTicket:         (role: UserRole) => role === 'admin' || !!getPerms(role).editTicket,
  deleteTicket:       (role: UserRole) => role === 'admin' || !!getPerms(role).deleteTicket,
  viewExpenses:       (role: UserRole) => role === 'admin' || !!getPerms(role).viewExpenses,
  createExpense:      (role: UserRole) => role === 'admin' || !!getPerms(role).createExpense,
  deleteExpense:      (role: UserRole) => role === 'admin' || !!getPerms(role).deleteExpense,
  viewInvoices:       (role: UserRole) => role === 'admin' || !!getPerms(role).viewInvoices,
  createInvoice:      (role: UserRole) => role === 'admin' || !!getPerms(role).createInvoice,
  deleteInvoice:      (role: UserRole) => role === 'admin' || !!getPerms(role).deleteInvoice,
  viewReports:        (role: UserRole) => role === 'admin' || !!getPerms(role).viewReports,
  createReport:       (role: UserRole) => role === 'admin' || !!getPerms(role).createReport,
  viewAnalytics:      (role: UserRole) => role === 'admin' || !!getPerms(role).viewAnalytics,
  viewStats:          (role: UserRole) => role === 'admin' || !!getPerms(role).viewStats,
  manageUsers:        (role: UserRole) => role === 'admin' || !!getPerms(role).manageUsers,
  viewDocuments:      (role: UserRole) => role === 'admin' || !!getPerms(role).viewDocuments,
  editContracts:      (role: UserRole) => role === 'admin' || !!getPerms(role).editContracts,
  viewMessages:       (role: UserRole) => role === 'admin' || !!getPerms(role).viewMessages,
  manageTenantPortal: (role: UserRole) => role === 'admin' || !!getPerms(role).manageTenantPortal,
};

export const getNavItems = (role: UserRole): string[] => {
  if (FULL_ACCESS_ROLES.includes(role)) {
    return ['properties','apartments','tenants','notices','leases','payments','onlinePayment','expenses',
      'accounting','disbursements','reports-terrain',
      'invoices','documents','contracts','maintenance','notifications',
      'analytics','stats','messages','reports','inspections','terminations','discharge','convention','weeklyOutings','contractTemplate','settings'];
  }
  if (isExecutiveRole(role)) {
    return ['analytics', 'stats', 'reports'];
  }
  if (role === 'directeur_financier' || role === 'coordinatrice') {
    return ['properties','tenants','leases','payments','onlinePayment','expenses','accounting',
      'invoices','documents','maintenance','notifications','analytics','stats','messages','reports'];
  }
  if (role === 'directeur_juridique') {
    return ['tenants','leases','documents','reports','stats','analytics'];
  }
  const p = getPerms(role);
  const map: Record<string, boolean> = {
    properties:    true,
    apartments:    true,
    tenants:       true,
    notices:       true,
    leases:        true,
    payments:      !!p.viewPayments,
    onlinePayment: !!p.onlinePayment,
    expenses:      !!p.viewExpenses,
    invoices:      !!p.viewInvoices,
    documents:     !!p.viewDocuments,
    maintenance:   true,
    notifications: true,
    analytics:     !!p.viewAnalytics,
    stats:         !!p.viewStats,
    messages:      !!p.viewMessages,
    reports:       !!p.viewReports,
    weeklyOutings: ['manager', 'agent', 'comptable'].includes(role as string),
    inspections:   true,
    terminations:  (role as string) === 'manager',
    discharge:     (role as string) === 'manager',
    convention:    (role as string) === 'manager',
  };
  return Object.entries(map).filter(([,v]) => v).map(([k]) => k);
};

export const getDashboardSections = (role: UserRole) => {
  const p = getPerms(role);
  if (isExecutiveRole(role)) {
    return {
      showRevenue: true,
      showFullStats: true,
      showPendingRents: true,
      showMaintenance: true,
      showExpiring: true,
      showCharts: true,
      showQuickActions: false,
      showFinance: true,
    };
  }
  return {
    showRevenue:      role === 'admin' || !!p.viewPayments,
    showFullStats:    role === 'admin' || !!p.viewAnalytics,
    showPendingRents: role === 'admin' || !!p.viewPayments,
    showMaintenance:  true,
    showExpiring:     role === 'admin' || !!p.viewPayments,
    showCharts:       role === 'admin' || !!p.viewAnalytics,
    showQuickActions: role === 'admin' || !!p.createPayment || !!p.createTicket,
    showFinance:      role === 'admin' || !!p.viewReports,
  };
};

// ─── LABELS LISIBLES ──────────────────────────────────────────
export const PERMISSION_GROUPS = [
  {
    label: 'Biens immobiliers',
    perms: [
      { key: 'createProperty', label: 'Créer un bien' },
      { key: 'editProperty',   label: 'Modifier un bien' },
      { key: 'deleteProperty', label: 'Supprimer un bien' },
    ],
  },
  {
    label: 'Locataires',
    perms: [
      { key: 'createTenant', label: 'Créer un locataire' },
      { key: 'editTenant',   label: 'Modifier un locataire' },
      { key: 'deleteTenant', label: 'Supprimer un locataire' },
    ],
  },
  {
    label: 'Contrats de bail',
    perms: [
      { key: 'createLease',  label: 'Créer un contrat' },
      { key: 'editLease',    label: 'Modifier un contrat' },
      { key: 'deleteLease',  label: 'Supprimer un contrat' },
      { key: 'editContracts',label: 'Éditer les modèles' },
    ],
  },
  {
    label: 'Paiements',
    perms: [
      { key: 'viewPayments',  label: 'Voir les paiements' },
      { key: 'createPayment', label: 'Enregistrer un paiement' },
      { key: 'editPayment',   label: 'Modifier un paiement' },
      { key: 'deletePayment', label: 'Supprimer un paiement' },
      { key: 'onlinePayment', label: 'Paiement en ligne' },
    ],
  },
  {
    label: 'Maintenance',
    perms: [
      { key: 'createTicket', label: 'Créer un ticket' },
      { key: 'editTicket',   label: 'Modifier un ticket' },
      { key: 'deleteTicket', label: 'Supprimer un ticket' },
    ],
  },
  {
    label: 'Finance & Comptabilité',
    perms: [
      { key: 'viewExpenses',  label: 'Voir les dépenses' },
      { key: 'createExpense', label: 'Créer une dépense' },
      { key: 'deleteExpense', label: 'Supprimer une dépense' },
      { key: 'viewInvoices',  label: 'Voir les factures' },
      { key: 'createInvoice', label: 'Créer une facture' },
      { key: 'deleteInvoice', label: 'Supprimer une facture' },
      { key: 'viewReports',   label: 'Voir les rapports' },
      { key: 'createReport',  label: 'Créer un rapport' },
    ],
  },
  {
    label: 'Analyse',
    perms: [
      { key: 'viewAnalytics', label: 'Analyses financières' },
      { key: 'viewStats',     label: 'Statistiques' },
    ],
  },
  {
    label: 'Communication',
    perms: [
      { key: 'viewMessages',       label: 'Messagerie locataires' },
      { key: 'manageTenantPortal', label: 'Portail locataire' },
    ],
  },
  {
    label: 'Administration',
    perms: [
      { key: 'viewDocuments', label: 'Voir les documents' },
      { key: 'manageUsers',   label: 'Gérer les utilisateurs' },
    ],
  },
];

export const ROLES_CONFIGURABLE: { role: UserRole; label: string; color: string; desc: string }[] = [
  // Direction
  { role: 'pdg',                    label: 'PDG',                        color: 'amber',  desc: 'Vision executive lecture seule' },
  { role: 'directeur_operations',   label: 'Dir. Opérations',            color: 'purple', desc: 'Accès complet toutes filiales' },
  { role: 'directeur_financier',    label: 'Dir. Financier',             color: 'purple', desc: 'Finance & comptabilité global' },
  { role: 'directeur_juridique',    label: 'Dir. Juridique & RH',        color: 'purple', desc: 'Contrats, baux et RH' },
  { role: 'coordinatrice',          label: 'Coordinatrice',              color: 'blue',   desc: 'Coordination transversale' },
  // Immobilier
  { role: 'manager',                label: 'Manager',                    color: 'blue',   desc: 'Gestion opérationnelle' },
  { role: 'agent',                  label: 'Agent',                      color: 'green',  desc: 'Terrain — paiements et tickets' },
  { role: 'comptable',              label: 'Comptable',                  color: 'purple', desc: 'Finance, factures et rapports' },
  { role: 'responsable_operations', label: 'Resp. Opérations',           color: 'cyan',   desc: 'Suivi opérationnel lecture seule' },
  { role: 'viewer',                 label: 'Lecteur',                    color: 'gray',   desc: 'Consultation uniquement' },
  // Logistique
  { role: 'manager_logistique',     label: 'Manager Logistique',         color: 'blue',   desc: 'Accès complet logistique' },
  { role: 'caissiere',              label: 'Caissière',                  color: 'green',  desc: 'Paiements et caisse' },
  { role: 'responsable_vente',      label: 'Resp. Vente',                color: 'amber',  desc: 'Commandes, clients, factures' },
  { role: 'assistante_admin',       label: 'Assistante Admin',           color: 'gray',   desc: 'Support administratif' },
  // Béton
  { role: 'manager_beton',          label: 'Manager Béton',              color: 'blue',   desc: 'Accès complet béton' },
  { role: 'responsable_production', label: 'Resp. Production',           color: 'purple', desc: 'Production et planning' },
  { role: 'operateur_centrale',     label: 'Opérateur Centrale',         color: 'green',  desc: 'Saisie production quotidienne' },
  { role: 'assistante_commerciale', label: 'Assistante Commerciale',     color: 'amber',  desc: 'Commandes clients et factures' },
  { role: 'responsable_qualite',    label: 'Resp. Qualité',              color: 'cyan',   desc: 'Contrôle qualité et conformité' },
];
