import { ListTeamUsersResponseDTO, toTeamUserResponse } from '@/modules/team/application/dtos/ListTeamUsersDTO';
import { IUserRepository, STAFF_ROLES } from '@/modules/users';

import { hasPermission } from '@/shared/auth/hasPermission';
import { Permission, PERMISSIONS } from '@/shared/auth/permissions';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

import type { StaffRole } from '@/modules/users';

export class ListTeamUsersUseCase implements IUseCase<void, ListTeamUsersResponseDTO> {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(): Promise<ListTeamUsersResponseDTO> {
    const staff = await this.userRepository.findStaff();

    const users = staff.map(toTeamUserResponse).sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '', 'pt-BR'));

    const roleDefaults = Object.fromEntries(
      STAFF_ROLES.map((role) => [role, PERMISSIONS.filter((permission) => hasPermission({ id: '', role, permissions: [] }, permission))]),
    ) as Record<StaffRole, Permission[]>;

    return { users, roles: [...STAFF_ROLES], permissionKeys: [...PERMISSIONS], roleDefaults };
  }
}
