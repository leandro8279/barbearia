import { toUserResponse, User, UserResponseDTO } from '@/modules/users';

import { hasPermission } from '@/shared/auth/hasPermission';
import { Permission, PERMISSIONS } from '@/shared/auth/permissions';

import type { StaffRole } from '@/modules/users';

export type TeamUserDTO = Omit<UserResponseDTO, 'tokenVersion'> & {
  effectivePermissions: Permission[];
  hasPassword: boolean;
};

export interface ListTeamUsersResponseDTO {
  users: TeamUserDTO[];
  roles: StaffRole[];
  permissionKeys: Permission[];
  roleDefaults: Record<StaffRole, Permission[]>;
}

export function toTeamUserResponse(user: User): TeamUserDTO {
  const { tokenVersion: _tokenVersion, ...safe } = toUserResponse(user);
  const subject = { id: user.id, role: user.role, permissions: user.permissions };

  return {
    ...safe,
    effectivePermissions: PERMISSIONS.filter((permission) => hasPermission(subject, permission)),
    hasPassword: Boolean(user.passwordHash),
  };
}
