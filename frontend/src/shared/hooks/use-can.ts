import type { Permission } from '@/shared/types/domain';
import { useSessionStore } from '@/shared/stores/session-store';

const roleGrants: Record<string, string[]> = {
  customer: [],
  barber: ['agenda.read', 'agenda.write', 'customers.read', 'catalog.read', 'commissions.read'],
  reception: ['agenda.*', 'cash.*', 'customers.*', 'catalog.read'],
  manager: ['*'],
  admin: ['*'],
};

export function useCan(permission: Permission): boolean {
  return useSessionStore((state) => {
    const user = state.user;
    if (!user) return false;
    const grants = [...(roleGrants[user.role] ?? []), ...user.permissions];
    return grants.some((grant) => grant === '*' || grant === permission || (grant.endsWith('.*') && permission.startsWith(grant.slice(0, -1))));
  });
}
