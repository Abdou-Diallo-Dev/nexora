import { UserRole } from './store';

export const can = {
  // Properties
  createProperty:  (role: UserRole) => ['admin','manager'].includes(role),
  editProperty:    (role: UserRole) => ['admin','manager'].includes(role),
  deleteProperty:  (role: UserRole) => ['admin'].includes(role),

  // Tenants
  createTenant:    (role: UserRole) => ['admin','manager'].includes(role),
  editTenant:      (role: UserRole) => ['admin','manager'].includes(role),
  deleteTenant:    (role: UserRole) => ['admin'].includes(role),

  // Leases
  createLease:     (role: UserRole) => ['admin','manager'].includes(role),
  editLease:       (role: UserRole) => ['admin','manager'].includes(role),
  deleteLease:     (role: UserRole) => ['admin'].includes(role),

  // Payments
  createPayment:   (role: UserRole) => ['admin','manager','agent','comptable'].includes(role),
  editPayment:     (role: UserRole) => ['admin','manager','comptable'].includes(role),
  deletePayment:   (role: UserRole) => ['admin','comptable'].includes(role),
  viewPayments:    (role: UserRole) => ['admin','manager','agent','viewer','comptable'].includes(role),

  // Online payments
  onlinePayment:   (role: UserRole) => ['admin','manager','comptable'].includes(role),

  // Maintenance
  createTicket:    (role: UserRole) => ['admin','manager','agent'].includes(role),
  editTicket:      (role: UserRole) => ['admin','manager','agent'].includes(role),
  deleteTicket:    (role: UserRole) => ['admin','manager'].includes(role),

  // Expenses
  viewExpenses:    (role: UserRole) => ['admin','manager','viewer','comptable'].includes(role),
  createExpense:   (role: UserRole) => ['admin','manager','comptable'].includes(role),
  deleteExpense:   (role: UserRole) => ['admin','comptable'].includes(role),

  // Invoices — comptable only
  viewInvoices:    (role: UserRole) => ['admin','manager','comptable'].includes(role),
  createInvoice:   (role: UserRole) => ['admin','comptable'].includes(role),
  deleteInvoice:   (role: UserRole) => ['admin','comptable'].includes(role),

  // Financial reports — comptable only
  viewReports:     (role: UserRole) => ['admin','comptable'].includes(role),
  createReport:    (role: UserRole) => ['admin','comptable'].includes(role),

  // Analytics
  viewAnalytics:   (role: UserRole) => ['admin','manager','comptable'].includes(role),
  viewStats:       (role: UserRole) => ['admin','manager','viewer','comptable'].includes(role),

  // Users management
  manageUsers:     (role: UserRole) => ['admin'].includes(role),

  // Documents
  viewDocuments:   (role: UserRole) => ['admin','manager','agent','viewer','comptable'].includes(role),
  editContracts:   (role: UserRole) => ['admin','manager'].includes(role),

  // Messages (locataires)
  viewMessages:    (role: UserRole) => ['admin','manager','agent'].includes(role),

  // Tenant portal
  manageTenantPortal: (role: UserRole) => ['admin','manager'].includes(role),
};

export const getNavItems = (role: UserRole) => {
  const all: Record<string, UserRole[]> = {
    properties:    ['admin','manager','agent','viewer','comptable'],
    tenants:       ['admin','manager','agent','viewer','comptable'],
    leases:        ['admin','manager','agent','viewer','comptable'],
    payments:      ['admin','manager','agent','viewer','comptable'],
    onlinePayment: ['admin','manager','comptable'],
    expenses:      ['admin','manager','viewer','comptable'],
    invoices:      ['admin','manager','comptable'],
    documents:     ['admin','manager','agent','viewer','comptable'],
    contracts:     ['admin','manager'],
    maintenance:   ['admin','manager','agent','viewer'],
    notifications: ['admin','manager','agent','viewer','comptable'],
    analytics:     ['admin','manager','comptable'],
    stats:         ['admin','manager','viewer','comptable'],
    messages:      ['admin','manager','agent'],
    reports:       ['admin','comptable'],
  };
  return Object.entries(all)
    .filter(([, roles]) => roles.includes(role))
    .map(([key]) => key);
};

export const getDashboardSections = (role: UserRole) => ({
  showRevenue:      ['admin','manager','comptable'].includes(role),
  showFullStats:    ['admin','manager','comptable'].includes(role),
  showPendingRents: ['admin','manager','agent','comptable'].includes(role),
  showMaintenance:  ['admin','manager','agent','viewer','comptable'].includes(role),
  showExpiring:     ['admin','manager','comptable'].includes(role),
  showCharts:       ['admin','manager','comptable'].includes(role),
  showQuickActions: ['admin','manager','agent'].includes(role),
  showFinance:      ['admin','comptable'].includes(role),
});