'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'agent' | 'viewer' | 'comptable' | 'tenant';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string | null;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppCompany {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  commission_rate?: number | null;
  commission_mode?: 'none' | 'ht' | 'ttc' | null;
  vat_rate?: number | null;
  modules: string[];
  plan: string;
  is_active: boolean;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  created_at: string;
}

interface AuthState {
  user: AppUser | null;
  company: AppCompany | null;
  isLoading: boolean;
  setUser: (u: AppUser | null) => void;
  setCompany: (c: AppCompany | null) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setCompany: (company) => set({ company }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ user: null, company: null, isLoading: false }),
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ user: s.user, company: s.company }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setLoading(false);
      },
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
