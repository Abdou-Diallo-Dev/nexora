import { UserRole } from './store';

// ─── PERMISSIONS PAR DEFAUT (fallback si pas de config en DB) ─
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
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

function getPerms(role: UserRole): Record<string, boolean> {
  if (role === 'admin' || role === 'super_admin') return ADMIN_PERMISSIONS;
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
  if (role === 'admin' || role === 'super_admin') {
    return ['properties','tenants','leases','payments','onlinePayment','expenses',
      'accounting','disbursements','reports-terrain',
      'invoices','documents','contracts','maintenance','notifications',
      'analytics','stats','messages','reports','inspections','terminations','discharge','convention','contractTemplate','settings'];
  }
  const p = getPerms(role);
  const map: Record<string, boolean> = {
    properties:    true,
    tenants:       true,
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
    inspections:   true,
    terminations:  (role as string) === 'manager',
    discharge:     (role as string) === 'manager',
    convention:    (role as string) === 'manager',
  };
  return Object.entries(map).filter(([,v]) => v).map(([k]) => k);
};

export const getDashboardSections = (role: UserRole) => {
  const p = getPerms(role);
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
  { role: 'manager',   label: 'Manager',    color: 'blue',   desc: 'Gestion opérationnelle quotidienne' },
  { role: 'agent',     label: 'Agent',      color: 'green',  desc: 'Terrain — paiements et tickets' },
  { role: 'comptable', label: 'Comptable',  color: 'purple', desc: 'Finance, factures et rapports' },
  { role: 'viewer',    label: 'Lecteur',    color: 'gray',   desc: 'Consultation uniquement' },
];