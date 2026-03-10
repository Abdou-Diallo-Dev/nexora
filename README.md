# ImmoGest Pro — SaaS Platform

Multi-tenant SaaS for real estate and logistics management built with Next.js 14, Supabase, TypeScript, and Tailwind CSS.

## Stack
- **Frontend**: Next.js 14 App Router · TypeScript · Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **State**: Zustand with persist
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Toasts**: Sonner
- **Deploy**: Vercel

## Quick Start

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Run migrations
# Paste supabase/migrations/001_initial.sql in Supabase SQL Editor

# 4. Start dev server
npm run dev
```

## Modules

### Gestion Immobilière
- Biens immobiliers (CRUD complet)
- Locataires (CRUD complet)
- Contrats de bail
- Paiements de loyers
- Paiement en ligne (Wave, Orange Money, Free Money, CinetPay)
- Dépenses
- Tickets de maintenance
- Génération PDF (quittances, contrats)
- Notifications (Email, SMS, WhatsApp)
- Analytics & statistiques

### Gestion Logistique
- Clients
- Commandes
- Expéditions
- Livraisons
- Chauffeurs
- Flotte de véhicules
- Entrepôt

## Roles
- `super_admin` — accès global toutes entreprises
- `admin` — accès complet à son entreprise
- `manager` — gestion opérationnelle
- `agent` — saisie et consultation
- `viewer` — lecture seule

## Architecture
- Multi-tenant: chaque `company` a son `company_id`
- RLS Supabase: isolation garantie par ligne
- Middleware Next.js: protection des routes authentifiées
- Cache mémoire 30s (qc) pour réduire les requêtes

## Payment Providers
Configure vos clés dans `.env.local`:
- **Wave**: WAVE_API_KEY
- **Orange Money**: ORANGE_MONEY_CLIENT_ID + ORANGE_MONEY_SECRET
- **CinetPay**: CINETPAY_API_KEY + CINETPAY_SITE_ID
- **Free Money**: FREE_MONEY_API_KEY + FREE_MONEY_MERCHANT_ID
