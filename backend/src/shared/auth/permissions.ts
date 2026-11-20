import type { UserRole } from '@/modules/users/domain/entities/User';

/** Permissões concretas (as que as rotas exigem). Adicione novas aqui. */
export const PERMISSIONS = [
  'agenda.read',
  'agenda.write',
  'customers.read',
  'customers.write',
  'catalog.read',
  'catalog.write',
  'commissions.read',
  'cash.read',
  'cash.write',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Domínio de uma permissão: 'agenda.read' -> 'agenda'. */
type Domain<P extends string> = P extends `${infer D}.${string}` ? D : never;

/** Concessão: permissão exata, wildcard de domínio ('agenda.*') ou '*'. */
export type Grant = Permission | `${Domain<Permission>}.*` | '*';

export const ROLE_PERMISSIONS: Record<UserRole, Grant[]> = {
  customer: [],
  barber: ['agenda.read', 'agenda.write', 'customers.read', 'catalog.read', 'commissions.read'],
  reception: ['agenda.*', 'cash.*', 'customers.*', 'catalog.read'],
  manager: ['*'], // 'settings.manage' é bloqueada em hasPermission
  admin: ['*'],
};
