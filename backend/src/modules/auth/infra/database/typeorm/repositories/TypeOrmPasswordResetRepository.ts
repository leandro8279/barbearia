import { IPasswordResetRepository, NewPasswordReset } from '@/modules/auth/domain/repositories/PasswordResetRepositoryInterface';
import { PasswordResetEntity } from '@/modules/auth/infra/database/typeorm/entities/PasswordResetEntity';

import { DataSource, LessThan } from 'typeorm';

export class TypeOrmPasswordResetRepository implements IPasswordResetRepository {
  constructor(private readonly dataSource: DataSource) {}

  async replaceForUser(reset: NewPasswordReset): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PasswordResetEntity, { userId: reset.userId });
      await manager.delete(PasswordResetEntity, { expiresAt: LessThan(new Date()) });
      await manager.insert(PasswordResetEntity, reset);
    });
  }
}
