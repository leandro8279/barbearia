import type { UserRole } from '@/modules/users/domain/entities/User';

export const STAFF_ROLES = ['barber', 'reception', 'manager', 'admin'] as const satisfies readonly UserRole[];
export type StaffRole = (typeof STAFF_ROLES)[number];
