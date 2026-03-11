'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { setCachedPermissions, DEFAULT_PERMISSIONS, ROLES_CONFIGURABLE } from '@/lib/permissions';

export function usePermissions() {
  const { company } = useAuthStore();

  useEffect(() => {
    if (!company?.id) return;
    const sb = createClient();
    sb.from('company_role_permissions')
      .select('role,permissions')
      .eq('company_id', company.id)
      .then(({ data }) => {
        const map: Record<string, Record<string, boolean>> = {};
        // Init defaults
        for (const r of ROLES_CONFIGURABLE) {
          map[r.role] = { ...DEFAULT_PERMISSIONS[r.role] };
        }
        // Override with DB
        for (const row of (data || [])) {
          map[row.role] = { ...map[row.role], ...(row.permissions as Record<string, boolean>) };
        }
        setCachedPermissions(company.id, map);
      });
  }, [company?.id]);
}