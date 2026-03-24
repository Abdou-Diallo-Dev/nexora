import type { UserRole } from '@/lib/store';

export const USER_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'agent',
  'viewer',
  'comptable',
  'pdg',
  'responsable_operations',
  'tenant',
];

export type UserProfileSeed = {
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string | null;
  is_active: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

export function roleRequiresCompany(role: UserRole) {
  return !['super_admin', 'tenant'].includes(role);
}

export function buildAuthUserMetadata(profile: Pick<UserProfileSeed, 'full_name' | 'role' | 'company_id' | 'is_active'>) {
  return {
    full_name: profile.full_name,
    role: profile.role,
    company_id: profile.company_id,
    is_active: profile.is_active,
  };
}

export function getProfileSeedFromAuthUser(authUser: {
  email?: string | null;
  user_metadata?: unknown;
}): UserProfileSeed | null {
  const metadata = isObject(authUser.user_metadata) ? authUser.user_metadata : {};
  const role = metadata.role;

  if (!isUserRole(role)) {
    return null;
  }

  const company_id =
    typeof metadata.company_id === 'string' && metadata.company_id.trim()
      ? metadata.company_id.trim()
      : null;

  if (roleRequiresCompany(role) && !company_id) {
    return null;
  }

  const email = (authUser.email || '').trim().toLowerCase();
  const full_name =
    typeof metadata.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : (email.split('@')[0] || 'Utilisateur');

  return {
    email,
    full_name,
    role,
    company_id,
    is_active: parseBoolean(metadata.is_active, true),
  };
}

export function shouldRepairUserProfile(
  existing: Partial<UserProfileSeed> | null | undefined,
  target: UserProfileSeed
) {
  if (!existing) return true;
  if (!existing.email || existing.email.trim().toLowerCase() !== target.email) return true;
  if (!existing.full_name || !existing.full_name.trim()) return true;
  if (existing.role !== target.role) return true;
  if (target.company_id && existing.company_id !== target.company_id) return true;
  if (roleRequiresCompany(target.role) && !existing.company_id) return true;
  return false;
}
