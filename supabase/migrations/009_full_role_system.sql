-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 009 — SARPA GROUP : Système de rôles complet
-- ═══════════════════════════════════════════════════════════════
-- À exécuter dans l'éditeur SQL Supabase (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Ajouter les nouvelles valeurs à l'enum user_role
-- ──────────────────────────────────────────────────────────────
-- Rôles existants éventuellement absents de l'enum initial
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'comptable';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pdg';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'responsable_operations';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tenant';

-- Direction SARPA GROUP (niveau 1 — global)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'directeur_operations';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'directeur_financier';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'directeur_juridique';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'coordinatrice';

-- Module Logistique
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager_logistique';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'caissiere';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'responsable_vente';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistante_admin';

-- Module Béton
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager_beton';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'responsable_production';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operateur_centrale';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'assistante_commerciale';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'responsable_qualite';

-- ──────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Table de templates de rôles système (référentiel)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key        VARCHAR(100) UNIQUE NOT NULL,
  module          VARCHAR(50)  NOT NULL DEFAULT 'global',
  -- 'global' | 'real_estate' | 'logistics' | 'beton'
  category        VARCHAR(50)  NOT NULL DEFAULT 'operationnel',
  -- 'super_admin' | 'direction' | 'operationnel'
  label           VARCHAR(100) NOT NULL,
  description     TEXT,
  access_level    VARCHAR(20)  NOT NULL DEFAULT 'partial',
  -- 'full' | 'partial' | 'readonly'
  permissions     JSONB        NOT NULL DEFAULT '{}',
  sort_order      INTEGER      NOT NULL DEFAULT 99,
  is_system       BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- RLS
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_templates_select" ON public.role_templates;
CREATE POLICY "role_templates_select" ON public.role_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "role_templates_manage" ON public.role_templates;
CREATE POLICY "role_templates_manage" ON public.role_templates
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- ──────────────────────────────────────────────────────────────
-- ÉTAPE 3 : Insérer les templates de rôles SARPA GROUP
-- ──────────────────────────────────────────────────────────────

-- ─── SUPER ADMIN ───────────────────────────────────────────────
INSERT INTO public.role_templates
  (role_key, module, category, label, description, access_level, permissions, sort_order)
VALUES (
  'super_admin', 'global', 'super_admin',
  'Super Administrateur',
  'Accès total à la plateforme. Crée/modifie/supprime utilisateurs, rôles, filiales et modules. Accède aux logs système et paramètres globaux.',
  'full',
  '{
    "all": true,
    "manageCompanies": true, "manageUsers": true, "manageRoles": true,
    "viewLogs": true, "manageSettings": true,
    "createProperty": true, "editProperty": true, "deleteProperty": true,
    "createTenant": true, "editTenant": true, "deleteTenant": true,
    "createLease": true, "editLease": true, "deleteLease": true,
    "createPayment": true, "editPayment": true, "deletePayment": true, "viewPayments": true,
    "onlinePayment": true,
    "createTicket": true, "editTicket": true, "deleteTicket": true,
    "viewExpenses": true, "createExpense": true, "deleteExpense": true,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": true,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "viewDocuments": true, "editContracts": true,
    "viewMessages": true, "manageTenantPortal": true
  }',
  0
)
ON CONFLICT (role_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  access_level = EXCLUDED.access_level,
  permissions = EXCLUDED.permissions;

-- ─── DIRECTION SARPA GROUP ─────────────────────────────────────
INSERT INTO public.role_templates
  (role_key, module, category, label, description, access_level, permissions, sort_order)
VALUES
(
  'pdg', 'global', 'direction',
  'PDG',
  'Président Directeur Général. Vue executive lecture seule sur toutes les filiales : tableau de bord consolidé, statistiques et rapports financiers.',
  'readonly',
  '{
    "createProperty": false, "editProperty": false, "deleteProperty": false,
    "createTenant": false, "editTenant": false, "deleteTenant": false,
    "createLease": false, "editLease": false, "deleteLease": false,
    "createPayment": false, "editPayment": false, "deletePayment": false, "viewPayments": false,
    "onlinePayment": false,
    "createTicket": false, "editTicket": false, "deleteTicket": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": false, "createInvoice": false, "deleteInvoice": false,
    "viewReports": true, "createReport": false,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": false, "editContracts": false,
    "viewMessages": false, "manageTenantPortal": false
  }',
  10
),
(
  'directeur_operations', 'global', 'direction',
  'Directeur des Opérations & Logistique',
  'Accès complet à toutes les filiales. Supervise les opérations logistique, béton et immobilier. Peut gérer les utilisateurs et consulter tous les rapports.',
  'full',
  '{
    "createProperty": true, "editProperty": true, "deleteProperty": true,
    "createTenant": true, "editTenant": true, "deleteTenant": true,
    "createLease": true, "editLease": true, "deleteLease": true,
    "createPayment": true, "editPayment": true, "deletePayment": true, "viewPayments": true,
    "onlinePayment": true,
    "createTicket": true, "editTicket": true, "deleteTicket": true,
    "viewExpenses": true, "createExpense": true, "deleteExpense": true,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": true,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": true,
    "viewDocuments": true, "editContracts": true,
    "viewMessages": true, "manageTenantPortal": true
  }',
  11
),
(
  'directeur_financier', 'global', 'direction',
  'Directeur Administratif & Financier',
  'Accès complet aux finances, paiements, dépenses, factures et rapports de toutes les filiales. Lecture seule sur les autres données.',
  'partial',
  '{
    "createProperty": false, "editProperty": false, "deleteProperty": false,
    "createTenant": false, "editTenant": false, "deleteTenant": false,
    "createLease": false, "editLease": false, "deleteLease": false,
    "createPayment": true, "editPayment": true, "deletePayment": true, "viewPayments": true,
    "onlinePayment": true,
    "createTicket": false, "editTicket": false, "deleteTicket": false,
    "viewExpenses": true, "createExpense": true, "deleteExpense": true,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": true,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true, "editContracts": false,
    "viewMessages": false, "manageTenantPortal": false
  }',
  12
),
(
  'directeur_juridique', 'global', 'direction',
  'Directeur Juridique & RH',
  'Gestion des contrats, baux, ressources humaines et conformité. Accès complet aux contrats et aux données locataires. Lecture sur les finances.',
  'partial',
  '{
    "createProperty": false, "editProperty": false, "deleteProperty": false,
    "createTenant": true, "editTenant": true, "deleteTenant": false,
    "createLease": true, "editLease": true, "deleteLease": true,
    "createPayment": false, "editPayment": false, "deletePayment": false, "viewPayments": true,
    "onlinePayment": false,
    "createTicket": false, "editTicket": false, "deleteTicket": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": true, "createInvoice": false, "deleteInvoice": false,
    "viewReports": true, "createReport": false,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": true,
    "viewDocuments": true, "editContracts": true,
    "viewMessages": false, "manageTenantPortal": false
  }',
  13
),
(
  'coordinatrice', 'global', 'direction',
  'Coordinatrice Générale',
  'Coordination transversale de toutes les filiales. Accès opérationnel large : locataires, paiements, contrats, tickets et messagerie.',
  'partial',
  '{
    "createProperty": false, "editProperty": true, "deleteProperty": false,
    "createTenant": true, "editTenant": true, "deleteTenant": false,
    "createLease": true, "editLease": true, "deleteLease": false,
    "createPayment": true, "editPayment": true, "deletePayment": false, "viewPayments": true,
    "onlinePayment": false,
    "createTicket": true, "editTicket": true, "deleteTicket": false,
    "viewExpenses": true, "createExpense": false, "deleteExpense": false,
    "viewInvoices": true, "createInvoice": false, "deleteInvoice": false,
    "viewReports": true, "createReport": false,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true, "editContracts": false,
    "viewMessages": true, "manageTenantPortal": true
  }',
  14
)
ON CONFLICT (role_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  access_level = EXCLUDED.access_level,
  permissions = EXCLUDED.permissions;

-- ─── MODULE IMMOBILIER ─────────────────────────────────────────
INSERT INTO public.role_templates
  (role_key, module, category, label, description, access_level, permissions, sort_order)
VALUES
(
  'admin', 'real_estate', 'operationnel',
  'Administrateur Immobilier',
  'Accès complet au sein de sa filiale immobilière. Gère utilisateurs, biens, locataires, contrats, paiements et finances.',
  'full',
  '{
    "createProperty": true, "editProperty": true, "deleteProperty": true,
    "createTenant": true, "editTenant": true, "deleteTenant": true,
    "createLease": true, "editLease": true, "deleteLease": true,
    "createPayment": true, "editPayment": true, "deletePayment": true, "viewPayments": true,
    "onlinePayment": true,
    "createTicket": true, "editTicket": true, "deleteTicket": true,
    "viewExpenses": true, "createExpense": true, "deleteExpense": true,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": true,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": true,
    "viewDocuments": true, "editContracts": true,
    "viewMessages": true, "manageTenantPortal": true
  }',
  20
),
(
  'manager', 'real_estate', 'operationnel',
  'Manager Immobilier',
  'Gestion opérationnelle quotidienne. Crée et modifie biens, locataires, contrats et paiements. Accès aux analyses et statistiques.',
  'partial',
  '{
    "createProperty": true, "editProperty": true, "deleteProperty": false,
    "createTenant": true, "editTenant": true, "deleteTenant": false,
    "createLease": true, "editLease": true, "deleteLease": false,
    "createPayment": true, "editPayment": true, "deletePayment": false, "viewPayments": true,
    "onlinePayment": true,
    "createTicket": true, "editTicket": true, "deleteTicket": true,
    "viewExpenses": true, "createExpense": true, "deleteExpense": false,
    "viewInvoices": true, "createInvoice": false, "deleteInvoice": false,
    "viewReports": false, "createReport": false,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true, "editContracts": true,
    "viewMessages": true, "manageTenantPortal": true
  }',
  21
),
(
  'comptable', 'real_estate', 'operationnel',
  'Comptable',
  'Finance, factures, dépenses et rapports. Accès complet aux données financières sans gestion des biens ni des locataires.',
  'partial',
  '{
    "createProperty": false, "editProperty": false, "deleteProperty": false,
    "createTenant": false, "editTenant": false, "deleteTenant": false,
    "createLease": false, "editLease": false, "deleteLease": false,
    "createPayment": true, "editPayment": true, "deletePayment": true, "viewPayments": true,
    "onlinePayment": true,
    "createTicket": false, "editTicket": false, "deleteTicket": false,
    "viewExpenses": true, "createExpense": true, "deleteExpense": true,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": true,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true, "editContracts": false,
    "viewMessages": false, "manageTenantPortal": false
  }',
  22
),
(
  'agent', 'real_estate', 'operationnel',
  'Agent Terrain',
  'Accès opérationnel limité. Peut enregistrer des paiements, créer et gérer des tickets de maintenance, consulter les données.',
  'partial',
  '{
    "createProperty": false, "editProperty": false, "deleteProperty": false,
    "createTenant": false, "editTenant": false, "deleteTenant": false,
    "createLease": false, "editLease": false, "deleteLease": false,
    "createPayment": true, "editPayment": false, "deletePayment": false, "viewPayments": true,
    "onlinePayment": false,
    "createTicket": true, "editTicket": true, "deleteTicket": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": false, "createInvoice": false, "deleteInvoice": false,
    "viewReports": false, "createReport": false,
    "viewAnalytics": false, "viewStats": false,
    "manageUsers": false,
    "viewDocuments": true, "editContracts": false,
    "viewMessages": true, "manageTenantPortal": false
  }',
  23
),
(
  'responsable_operations', 'real_estate', 'operationnel',
  'Responsable Opérations',
  'Suivi opérationnel lecture seule. Consulte les indicateurs, analyses financières et rapports. Aucune modification.',
  'readonly',
  '{
    "createProperty": false, "editProperty": false, "deleteProperty": false,
    "createTenant": false, "editTenant": false, "deleteTenant": false,
    "createLease": false, "editLease": false, "deleteLease": false,
    "createPayment": false, "editPayment": false, "deletePayment": false, "viewPayments": false,
    "onlinePayment": false,
    "createTicket": false, "editTicket": false, "deleteTicket": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": false, "createInvoice": false, "deleteInvoice": false,
    "viewReports": true, "createReport": false,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": false, "editContracts": false,
    "viewMessages": false, "manageTenantPortal": false
  }',
  24
),
(
  'viewer', 'real_estate', 'operationnel',
  'Lecteur',
  'Accès en lecture seule. Consulte toutes les données sans pouvoir les modifier.',
  'readonly',
  '{
    "createProperty": false, "editProperty": false, "deleteProperty": false,
    "createTenant": false, "editTenant": false, "deleteTenant": false,
    "createLease": false, "editLease": false, "deleteLease": false,
    "createPayment": false, "editPayment": false, "deletePayment": false, "viewPayments": true,
    "onlinePayment": false,
    "createTicket": false, "editTicket": false, "deleteTicket": false,
    "viewExpenses": true, "createExpense": false, "deleteExpense": false,
    "viewInvoices": false, "createInvoice": false, "deleteInvoice": false,
    "viewReports": false, "createReport": false,
    "viewAnalytics": false, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true, "editContracts": false,
    "viewMessages": false, "manageTenantPortal": false
  }',
  25
)
ON CONFLICT (role_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  access_level = EXCLUDED.access_level,
  permissions = EXCLUDED.permissions;

-- ─── MODULE LOGISTIQUE ─────────────────────────────────────────
INSERT INTO public.role_templates
  (role_key, module, category, label, description, access_level, permissions, sort_order)
VALUES
(
  'manager_logistique', 'logistics', 'operationnel',
  'Manager Logistique',
  'Accès complet au module logistique. Gère livraisons, commandes, flotte, chauffeurs, stock et finances.',
  'full',
  '{
    "manageLivraisons": true, "manageCommandes": true, "manageFlotte": true,
    "manageChauffeurs": true, "manageStock": true, "manageClients": true,
    "viewPayments": true, "createPayment": true, "editPayment": true, "deletePayment": true,
    "viewExpenses": true, "createExpense": true, "deleteExpense": true,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": true,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": true,
    "viewDocuments": true
  }',
  30
),
(
  'caissiere', 'logistics', 'operationnel',
  'Caissière',
  'Gestion de la caisse et des paiements. Enregistre les encaissements, dépenses et factures. Consultation des statistiques.',
  'partial',
  '{
    "manageLivraisons": false, "manageCommandes": false, "manageFlotte": false,
    "manageChauffeurs": false, "manageStock": false, "manageClients": false,
    "viewPayments": true, "createPayment": true, "editPayment": true, "deletePayment": false,
    "viewExpenses": true, "createExpense": true, "deleteExpense": false,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": false,
    "viewReports": false, "createReport": false,
    "viewAnalytics": false, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": false
  }',
  31
),
(
  'responsable_vente', 'logistics', 'operationnel',
  'Responsable Vente',
  'Gestion commerciale. Traite les commandes, gère les clients, émet les factures et suit les performances de vente.',
  'partial',
  '{
    "manageLivraisons": true, "manageCommandes": true, "manageFlotte": false,
    "manageChauffeurs": false, "manageStock": true, "manageClients": true,
    "viewPayments": true, "createPayment": false, "editPayment": false, "deletePayment": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": false,
    "viewReports": true, "createReport": false,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true
  }',
  32
),
(
  'assistante_admin', 'logistics', 'operationnel',
  'Assistante Administrative',
  'Support administratif. Saisie des données, suivi des dossiers, gestion de la messagerie et consultation des états.',
  'partial',
  '{
    "manageLivraisons": false, "manageCommandes": false, "manageFlotte": false,
    "manageChauffeurs": false, "manageStock": false, "manageClients": true,
    "viewPayments": true, "createPayment": true, "editPayment": false, "deletePayment": false,
    "viewExpenses": true, "createExpense": false, "deleteExpense": false,
    "viewInvoices": true, "createInvoice": false, "deleteInvoice": false,
    "viewReports": false, "createReport": false,
    "viewAnalytics": false, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true,
    "viewMessages": true
  }',
  33
)
ON CONFLICT (role_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  access_level = EXCLUDED.access_level,
  permissions = EXCLUDED.permissions;

-- ─── MODULE BÉTON ──────────────────────────────────────────────
INSERT INTO public.role_templates
  (role_key, module, category, label, description, access_level, permissions, sort_order)
VALUES
(
  'manager_beton', 'beton', 'operationnel',
  'Manager Béton',
  'Accès complet au module béton. Gère production, qualité, stock, commandes, flotte, livraisons et finances.',
  'full',
  '{
    "manageProduction": true, "manageQualite": true, "manageStock": true,
    "manageCommandes": true, "manageLivraisons": true, "manageClients": true,
    "manageFlotte": true, "manageMaintenance": true,
    "viewPayments": true, "createPayment": true, "editPayment": true, "deletePayment": true,
    "viewExpenses": true, "createExpense": true, "deleteExpense": true,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": true,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": true,
    "viewDocuments": true
  }',
  40
),
(
  'responsable_production', 'beton', 'operationnel',
  'Responsable Production',
  'Supervision de la production et du planning. Gère les recettes, le suivi des coulées, le planning et les rapports de production.',
  'partial',
  '{
    "manageProduction": true, "manageQualite": true, "manageStock": true,
    "manageCommandes": false, "manageLivraisons": true, "manageClients": false,
    "manageFlotte": false, "manageMaintenance": true,
    "viewPayments": true, "createPayment": false, "editPayment": false, "deletePayment": false,
    "viewExpenses": true, "createExpense": true, "deleteExpense": false,
    "viewInvoices": false, "createInvoice": false, "deleteInvoice": false,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true
  }',
  41
),
(
  'operateur_centrale', 'beton', 'operationnel',
  'Opérateur Centrale',
  'Opérations quotidiennes de production. Saisit les coulées, gère les tickets de maintenance et consulte le planning.',
  'partial',
  '{
    "manageProduction": true, "manageQualite": false, "manageStock": false,
    "manageCommandes": false, "manageLivraisons": false, "manageClients": false,
    "manageFlotte": false, "manageMaintenance": true,
    "viewPayments": false, "createPayment": false, "editPayment": false, "deletePayment": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": false, "createInvoice": false, "deleteInvoice": false,
    "viewReports": false, "createReport": false,
    "viewAnalytics": false, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true
  }',
  42
),
(
  'assistante_commerciale', 'beton', 'operationnel',
  'Assistante Commerciale',
  'Gestion commerciale et administrative. Traite les commandes, gère les clients, émet les devis et les factures.',
  'partial',
  '{
    "manageProduction": false, "manageQualite": false, "manageStock": false,
    "manageCommandes": true, "manageLivraisons": false, "manageClients": true,
    "manageFlotte": false, "manageMaintenance": false,
    "viewPayments": true, "createPayment": false, "editPayment": false, "deletePayment": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": true, "createInvoice": true, "deleteInvoice": false,
    "viewReports": false, "createReport": false,
    "viewAnalytics": false, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true,
    "viewMessages": true
  }',
  43
),
(
  'responsable_qualite', 'beton', 'operationnel',
  'Responsable Qualité',
  'Contrôle qualité et conformité. Valide les productions, génère les rapports de conformité et gère les non-conformités.',
  'partial',
  '{
    "manageProduction": false, "manageQualite": true, "manageStock": false,
    "manageCommandes": false, "manageLivraisons": false, "manageClients": false,
    "manageFlotte": false, "manageMaintenance": false,
    "viewPayments": false, "createPayment": false, "editPayment": false, "deletePayment": false,
    "viewExpenses": false, "createExpense": false, "deleteExpense": false,
    "viewInvoices": false, "createInvoice": false, "deleteInvoice": false,
    "viewReports": true, "createReport": true,
    "viewAnalytics": true, "viewStats": true,
    "manageUsers": false,
    "viewDocuments": true
  }',
  44
)
ON CONFLICT (role_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  access_level = EXCLUDED.access_level,
  permissions = EXCLUDED.permissions;

-- ──────────────────────────────────────────────────────────────
-- ÉTAPE 4 : Vue utilitaire role_templates_view
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.role_templates_view AS
SELECT
  role_key,
  module,
  category,
  label,
  description,
  access_level,
  sort_order,
  permissions
FROM public.role_templates
ORDER BY sort_order;

-- Accès en lecture à tous les utilisateurs authentifiés
GRANT SELECT ON public.role_templates_view TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- ÉTAPE 5 : Ajouter la colonne module_access sur users
-- (indique sur quel module cet utilisateur est autorisé)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS module_access TEXT[] DEFAULT '{}';

-- Ex: {'real_estate'} pour un agent immobilier
-- Ex: {'logistics', 'beton'} pour un directeur des opérations
-- Ex: {} = accès à tous les modules (super_admin, pdg, directeurs)

-- ──────────────────────────────────────────────────────────────
-- ÉTAPE 6 : Mise à jour de la fonction get_user_role (utilitaire)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.users WHERE id = p_user_id;
$$;

-- ──────────────────────────────────────────────────────────────
-- ÉTAPE 7 : Helper pour vérifier si un utilisateur est direction
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_direction_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_role IN (
    'super_admin', 'pdg',
    'directeur_operations', 'directeur_financier',
    'directeur_juridique', 'coordinatrice'
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- VÉRIFICATION : Afficher tous les rôles configurés
-- ──────────────────────────────────────────────────────────────
-- SELECT role_key, module, category, label, access_level
-- FROM public.role_templates_view;
