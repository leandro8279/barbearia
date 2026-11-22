import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import { ITeamRepository } from '@/modules/team/domain/repositories/TeamRepositoryInterface';
import { User } from '@/modules/users';
import { UserEntity } from '@/modules/users/infra/entities/UserEntity';

import { DataSource, Not } from 'typeorm';

class LastAdminRollback extends Error {}

export class TypeOrmTeamRepository implements ITeamRepository {
  constructor(private readonly dataSource: DataSource) {}

  async countOtherActiveAdmins(excludeUserId: string): Promise<number> {
    return this.dataSource.getRepository(UserEntity).count({ where: { role: 'admin', active: true, id: Not(excludeUserId) } });
  }

  async saveAccess(member: User, { guardLastAdmin }: { guardLastAdmin: boolean }): Promise<boolean> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          UserEntity,
          { id: member.id },
          {
            role: member.role,
            active: member.active,
            permissions: member.permissions,
            tokenVersion: member.tokenVersion,
            updatedAt: member.updatedAt,
          },
        );

        // Só atende como barbeiro quem está ativo e com papel de barbeiro.
        await manager.update(BarberEntity, { userId: member.id }, { active: member.active && member.role === 'barber' });

        if (guardLastAdmin && (await manager.count(UserEntity, { where: { role: 'admin', active: true } })) === 0) {
          throw new LastAdminRollback();
        }
      });

      return true;
    } catch (error) {
      if (error instanceof LastAdminRollback) return false;
      throw error;
    }
  }
}
