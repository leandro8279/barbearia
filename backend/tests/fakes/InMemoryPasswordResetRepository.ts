import { IPasswordResetRepository, PasswordReset } from '@/modules/auth/domain/repositories/PasswordResetRepositoryInterface';

export class InMemoryPasswordResetRepository implements IPasswordResetRepository {
  items: PasswordReset[] = [];

  async create(reset: PasswordReset) {
    this.items.push(reset);
  }

  async consume(tokenHash: string, now: Date) {
    const index = this.items.findIndex((i) => i.tokenHash === tokenHash && i.expiresAt > now);
    if (index === -1) return null;
    const [{ userId }] = this.items.splice(index, 1);
    return { userId };
  }

  async deleteByUserId(userId: string) {
    this.items = this.items.filter((i) => i.userId !== userId);
  }
}
