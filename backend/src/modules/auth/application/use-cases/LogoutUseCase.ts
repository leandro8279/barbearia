import { LogoutDTO } from '@/modules/auth/application/dtos/LogoutDTO';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type LogoutOutput = Either<UnauthorizedError, void>;

export class LogoutUseCase implements IUseCase<LogoutDTO, LogoutOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ userId }: LogoutDTO): Promise<LogoutOutput> {
    const user = await this.userRepository.findById(userId);
    if (!user) return left(new UnauthorizedError());

    user.revokeTokens();
    await this.userRepository.update(user);

    await this.auditLogger.log({ actorId: user.id, action: 'auth.logout', entity: 'users', entityId: user.id });

    return right(undefined);
  }
}
