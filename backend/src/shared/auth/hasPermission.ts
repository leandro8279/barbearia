import { Permission, ROLE_PERMISSIONS } from '@/shared/auth/permissions';
import type { ITokenPayload } from '@/shared/interfaces/HttpInterface';

export function hasPermission(user: ITokenPayload | undefined | null, permission: Permission): boolean {
  if (!user || !user.role) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager' && permission === 'settings.manage') return false;

  const grants: string[] = [...ROLE_PERMISSIONS[user.role], ...(Array.isArray(user.permissions) ? user.permissions : [])];

  return grants.some((grant) => grant === '*' || grant === permission || (grant.endsWith('.*') && permission.startsWith(grant.slice(0, -1))));
}
