import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe: minimum 8 caractères'),
});

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe: minimum 8 caractères'),
  full_name: z.string().min(2, 'Nom requis'),
  company_name: z.string().min(2, 'Nom entreprise requis'),
  modules: z.array(z.enum(['real_estate', 'logistics'])).min(1, 'Sélectionnez au moins un module'),
});

// Property schemas
export const propertySchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  address: z.string().min(5, 'Adresse requise'),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().default('France'),
  type: z.enum(['apartment', 'house', 'commercial', 'office', 'warehouse', 'land']),
  status: z.enum(['available', 'rented', 'maintenance', 'sold']).default('available'),
  owner_name: z.string().optional(),
  owner_email: z.string().email().optional().or(z.literal('')),
  owner_phone: z.string().optional(),
  rent_amount: z.number().min(0, 'Montant invalide'),
  charges_amount: z.number().min(0).default(0),
  surface_area: z.number().positive().optional(),
  rooms_count: z.number().int().positive().optional(),
  description: z.string().optional(),
});

// Tenant schemas
export const tenantSchema = z.object({
  first_name: z.string().min(2, 'Prénom requis'),
  last_name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  nationality: z.string().optional(),
  guarantor_name: z.string().optional(),
  guarantor_phone: z.string().optional(),
  notes: z.string().optional(),
});

// Lease schemas
export const leaseSchema = z.object({
  property_id: z.string().uuid('Bien invalide'),
  tenant_id: z.string().uuid('Locataire invalide'),
  start_date: z.string(),
  end_date: z.string(),
  rent_amount: z.number().min(0),
  charges_amount: z.number().min(0).default(0),
  deposit_amount: z.number().min(0).default(0),
  payment_day: z.number().int().min(1).max(28).default(1),
  notes: z.string().optional(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: 'La date de fin doit être après la date de début',
  path: ['end_date'],
});

// Payment schemas
export const paymentSchema = z.object({
  lease_id: z.string().uuid(),
  amount: z.number().min(0),
  charges_amount: z.number().min(0).default(0),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2020).max(2100),
  due_date: z.string(),
  paid_date: z.string().optional(),
  status: z.enum(['paid', 'pending', 'late', 'partial']).default('pending'),
  payment_method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Maintenance schemas
export const maintenanceSchema = z.object({
  property_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  title: z.string().min(3, 'Titre requis'),
  description: z.string().min(10, 'Description requise'),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  scheduled_date: z.string().optional(),
  estimated_cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Expense schemas
export const expenseSchema = z.object({
  property_id: z.string().uuid().optional(),
  category: z.string().min(2, 'Catégorie requise'),
  description: z.string().min(3, 'Description requise'),
  amount: z.number().min(0),
  expense_date: z.string(),
  vendor_name: z.string().optional(),
  notes: z.string().optional(),
});

// Client schemas
export const clientSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('France'),
  notes: z.string().optional(),
}).refine(data => data.company_name || (data.first_name && data.last_name), {
  message: 'Nom complet ou nom d\'entreprise requis',
  path: ['company_name'],
});

// Order schemas
export const orderSchema = z.object({
  client_id: z.string().uuid('Client invalide'),
  origin_address: z.string().optional(),
  destination_address: z.string().min(5, 'Adresse destination requise'),
  destination_city: z.string().optional(),
  weight_kg: z.number().min(0).optional(),
  volume_m3: z.number().min(0).optional(),
  requested_delivery_date: z.string().optional(),
  notes: z.string().optional(),
});

// Driver schemas
export const driverSchema = z.object({
  first_name: z.string().min(2, 'Prénom requis'),
  last_name: z.string().min(2, 'Nom requis'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(8, 'Téléphone requis'),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  notes: z.string().optional(),
});

// Vehicle schemas
export const vehicleSchema = z.object({
  type: z.enum(['truck', 'van', 'motorcycle', 'car', 'bicycle']),
  brand: z.string().optional(),
  model: z.string().optional(),
  license_plate: z.string().min(4, 'Plaque invalide'),
  year: z.number().int().min(1990).max(2030).optional(),
  capacity_kg: z.number().min(0).optional(),
  capacity_volume: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Inventory schemas
export const inventorySchema = z.object({
  sku:          z.string().min(2, 'SKU requis'),
  name:         z.string().min(2, 'Nom requis'),
  description:  z.string().optional(),
  category:     z.string().optional(),
  quantity:     z.coerce.number().min(0),
  min_quantity: z.coerce.number().min(0),
  unit:         z.string().min(1),
  location:     z.string().optional(),
  unit_cost:    z.coerce.number().min(0),
  notes:        z.string().optional(),
});
// Shipment schemas
export const shipmentSchema = z.object({
  order_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  origin_address: z.string().min(5, 'Adresse origine requise'),
  destination_address: z.string().min(5, 'Adresse destination requise'),
  pickup_date: z.string().optional(),
  estimated_delivery_date: z.string().optional(),
  distance_km: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type LeaseInput = z.infer<typeof leaseSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
export type ShipmentInput = z.infer<typeof shipmentSchema>;
