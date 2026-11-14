import type { Permission } from '@/shared/types/domain';
import { sessionStore } from '@/shared/stores/session-store';

const roleGrants: Record<string, string[]> = {
  customer: [],
  barber: ['agenda.read', 'agenda.write', 'customers.read', 'catalog.read', 'commissions.read'],
  reception: ['agenda.*', 'cash.*', 'customers.*', 'catalog.read'],
  manager: ['*'],
  admin: ['*'],
};

function matchesGrant(grant: string, permission: Permission): boolean {
  if (grant === '*' || grant === permission) return true;
  // 'users.*' cobre 'users.create', 'users.delete', ...
  return grant.endsWith('.*') && permission.startsWith(grant.slice(0, -1));
}

export function useCan(permission: Permission): boolean {
  const user = sessionStore.user;
  if (!user) return false;

  const grants = [...(roleGrants[user.role] ?? []), ...user.permissions];
  return grants.some((grant) => matchesGrant(grant, permission));
}
