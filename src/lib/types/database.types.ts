// Auto-generated types from Supabase schema
// Run: npm run db:generate to regenerate

import type { CompanySettings } from './settings.types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          email: string;
          phone: string | null;
          address: string | null;
          logo_url: string | null;
          website: string | null;
          modules: ('real_estate' | 'logistics')[];
          is_active: boolean;
          subscription_plan: string;
          subscription_expires_at: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          company_id: string | null;
          email: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          role: 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';
          is_active: boolean;
          last_login_at: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      properties: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          address: string;
          city: string | null;
          zip_code: string | null;
          country: string;
          type: 'apartment' | 'house' | 'commercial' | 'office' | 'warehouse' | 'land';
          status: 'available' | 'rented' | 'maintenance' | 'sold';
          owner_name: string | null;
          owner_email: string | null;
          owner_phone: string | null;
          rent_amount: number;
          charges_amount: number;
          surface_area: number | null;
          rooms_count: number | null;
          description: string | null;
          images: string[];
          amenities: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      tenants: {
        Row: {
          id: string;
          company_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          birth_date: string | null;
          nationality: string | null;
          id_document_url: string | null;
          income_proof_url: string | null;
          guarantor_name: string | null;
          guarantor_phone: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      leases: {
        Row: {
          id: string;
          company_id: string;
          property_id: string;
          tenant_id: string;
          start_date: string;
          end_date: string;
          rent_amount: number;
          charges_amount: number;
          deposit_amount: number;
          payment_day: number;
          status: 'active' | 'expired' | 'terminated' | 'pending';
          contract_url: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leases']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['leases']['Insert']>;
      };
      rent_payments: {
        Row: {
          id: string;
          company_id: string;
          lease_id: string;
          amount: number;
          charges_amount: number;
          period_month: number;
          period_year: number;
          due_date: string;
          paid_date: string | null;
          status: 'paid' | 'pending' | 'late' | 'partial';
          payment_method: string | null;
          reference: string | null;
          receipt_url: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rent_payments']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['rent_payments']['Insert']>;
      };
      maintenance_tickets: {
        Row: {
          id: string;
          company_id: string;
          property_id: string;
          tenant_id: string | null;
          assigned_to: string | null;
          title: string;
          description: string;
          category: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
          images: string[];
          estimated_cost: number | null;
          actual_cost: number | null;
          scheduled_date: string | null;
          completed_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['maintenance_tickets']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['maintenance_tickets']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          company_id: string;
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string;
          notes: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          company_id: string;
          client_id: string;
          order_number: string;
          status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
          total_amount: number;
          weight_kg: number | null;
          volume_m3: number | null;
          origin_address: string | null;
          destination_address: string;
          destination_city: string | null;
          notes: string | null;
          requested_delivery_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      shipments: {
        Row: {
          id: string;
          company_id: string;
          order_id: string | null;
          driver_id: string | null;
          vehicle_id: string | null;
          tracking_number: string | null;
          status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'returned';
          origin_address: string;
          destination_address: string;
          pickup_date: string | null;
          estimated_delivery_date: string | null;
          actual_delivery_date: string | null;
          distance_km: number | null;
          cost: number | null;
          notes: string | null;
          proof_of_delivery_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['shipments']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['shipments']['Insert']>;
      };
      drivers: {
        Row: {
          id: string;
          company_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string;
          license_number: string | null;
          license_expiry: string | null;
          status: 'available' | 'on_delivery' | 'off_duty' | 'suspended';
          avatar_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['drivers']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>;
      };
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          type: 'truck' | 'van' | 'motorcycle' | 'car' | 'bicycle';
          brand: string | null;
          model: string | null;
          license_plate: string;
          year: number | null;
          capacity_kg: number | null;
          capacity_volume: number | null;
          status: 'available' | 'in_use' | 'maintenance' | 'retired';
          last_maintenance_date: string | null;
          next_maintenance_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      inventory: {
        Row: {
          id: string;
          company_id: string;
          sku: string;
          name: string;
          description: string | null;
          category: string | null;
          quantity: number;
          min_quantity: number;
          unit: string;
          location: string | null;
          unit_cost: number;
          image_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          company_id: string | null;
          type: 'info' | 'success' | 'warning' | 'error';
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import';
          entity_type: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
};

// Helper types
export type Company = Database['public']['Tables']['companies']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type Property = Database['public']['Tables']['properties']['Row'];
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type Lease = Database['public']['Tables']['leases']['Row'];
export type RentPayment = Database['public']['Tables']['rent_payments']['Row'];
export type MaintenanceTicket = Database['public']['Tables']['maintenance_tickets']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Shipment = Database['public']['Tables']['shipments']['Row'];
export type Driver = Database['public']['Tables']['drivers']['Row'];
export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type InventoryItem = Database['public']['Tables']['inventory']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
