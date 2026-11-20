import { IPasswordResetRepository, NewPasswordReset, PasswordReset } from '@/modules/auth/domain/repositories/PasswordResetRepositoryInterface';
import { PasswordResetEntity } from '@/modules/auth/infra/entities/PasswordResetEntity';

import { DataSource, LessThan, Repository } from 'typeorm';

export class TypeOrmPasswordResetRepository implements IPasswordResetRepository {
  private readonly repository: Repository<PasswordResetEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(PasswordResetEntity);
  }

  async replaceForUser(reset: NewPasswordReset): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PasswordResetEntity, { userId: reset.userId });
      await manager.delete(PasswordResetEntity, { expiresAt: LessThan(new Date()) });
      await manager.insert(PasswordResetEntity, reset);
    });
  }

  async create(reset: PasswordReset): Promise<void> {
    await this.repository.save(this.repository.create(reset));
  }

  async consume(tokenHash: string, now: Date): Promise<{ userId: string } | null> {
    const entity = await this.repository.findOneBy({ tokenHash });
    if (!entity || entity.expiresAt.getTime() <= now.getTime()) return null;

    const result = await this.repository.delete({ tokenHash });
    return result.affected ? { userId: entity.userId } : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }
}
