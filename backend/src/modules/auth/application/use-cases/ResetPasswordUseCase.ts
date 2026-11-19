import { ResetPasswordDTO } from '@/modules/auth/application/dtos/ResetPasswordDTO';
import { InvalidResetTokenError } from '@/modules/auth/application/errors/InvalidResetTokenError';
import { IPasswordResetRepository } from '@/modules/auth/domain/repositories/PasswordResetRepositoryInterface';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { IHashProvider } from '@/shared/providers/hash/HashProviderInterface';

import { createHash } from 'node:crypto';

export type ResetPasswordOutput = Either<InvalidResetTokenError, { message: string }>;

export class ResetPasswordUseCase implements IUseCase<ResetPasswordDTO, ResetPasswordOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly hashProvider: IHashProvider,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ token, password }: ResetPasswordDTO): Promise<ResetPasswordOutput> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const reset = await this.passwordResetRepository.consume(tokenHash, new Date());
    if (!reset) return left(new InvalidResetTokenError());

    const user = await this.userRepository.findById(reset.userId);
    if (!user || !user.active) return left(new InvalidResetTokenError());

    user.changePassword(await this.hashProvider.hash(password));
    await this.userRepository.update(user);

    await this.passwordResetRepository.deleteByUserId(user.id);

    await this.auditLogger.log({ actorId: null, action: 'auth.password.reset', entity: 'users', entityId: user.id });

    return right({ message: 'Senha alterada com sucesso' });
  }
}
