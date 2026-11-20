import { ChangePasswordDTO } from '@/modules/auth/application/dtos/ChangePasswordDTO';
import { InvalidCurrentPasswordError } from '@/modules/auth/application/errors/InvalidCurrentPasswordError';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { IHashProvider } from '@/shared/providers/hash/HashProviderInterface';

export type ChangePasswordError = UnauthorizedError | InvalidCurrentPasswordError;
export type ChangePasswordOutput = Either<ChangePasswordError, { message: string }>;

export class ChangePasswordUseCase implements IUseCase<ChangePasswordDTO, ChangePasswordOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ userId, currentPassword, password }: ChangePasswordDTO): Promise<ChangePasswordOutput> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.active) return left(new UnauthorizedError());

    // Convidado não tem senha: trata como senha atual incorreta.
    const matches = user.passwordHash ? await this.hashProvider.compare(currentPassword, user.passwordHash) : false;
    if (!matches) return left(new InvalidCurrentPasswordError());

    user.changePassword(await this.hashProvider.hash(password)); // incrementa tokenVersion
    await this.userRepository.update(user);

    await this.auditLogger.log({ actorId: user.id, action: 'auth.password.change', entity: 'users', entityId: user.id });

    return right({ message: 'Senha alterada. Entre novamente.' });
  }
}
