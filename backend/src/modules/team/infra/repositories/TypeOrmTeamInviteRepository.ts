import { PasswordResetEntity } from '@/modules/auth/infra/entities/PasswordResetEntity';
import { ITeamInviteRepository, TeamInvite } from '@/modules/team/domain/repositories/TeamInviteRepositoryInterface';
import { EmailAlreadyExistsError, User } from '@/modules/users';
import { UserEntity } from '@/modules/users/infra/entities/UserEntity';
import { UserMapper } from '@/modules/users/infra/mappers/UserMapper';

import { DataSource, QueryDeepPartialEntity, QueryFailedError } from 'typeorm';

export class TypeOrmTeamInviteRepository implements ITeamInviteRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createInvitedUser(user: User, { tokenHash, expiresAt }: TeamInvite): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(UserEntity, UserMapper.toPersistence(user) as QueryDeepPartialEntity<UserEntity>);
        await manager.insert(PasswordResetEntity, { tokenHash, userId: user.id, expiresAt });
      });
    } catch (error) {
      throw this.translateConstraintError(error);
    }
  }

  private translateConstraintError(error: unknown): unknown {
    if (!(error instanceof QueryFailedError)) return error;

    const { code, message } = error.driverError as { code?: string; message?: string };
    if (code === 'SQLITE_CONSTRAINT_UNIQUE' && message?.includes('users.email')) return new EmailAlreadyExistsError();

    return error;
  }
}
