import type { UserRole } from '@/modules/users/domain/entities/User';

/** Ajuste conforme as regras da barbearia. Suporta '*' e prefixos como 'appointments.*'. */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  manager: ['*'], // exceto 'settings.manage' (regra em hasPermission)
  reception: ['appointments.*', 'customers.read', 'customers.create', 'customers.update'],
  barber: ['appointments.read', 'appointments.update', 'customers.read'],
  customer: [],
};
