import { ForgotPasswordDTO } from '@/modules/auth/application/dtos/ForgotPasswordDTO';
import { buildPasswordResetEmail } from '@/modules/auth/application/mail/passwordResetEmail';
import { IPasswordResetRepository } from '@/modules/auth/domain/repositories/PasswordResetRepositoryInterface';
import { IUserRepository, User } from '@/modules/users';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { IMailProvider } from '@/shared/providers/mail/MailProviderInterface';

import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export interface ForgotPasswordOutput {
  message: string;
}

const MESSAGE = 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.';

export class ForgotPasswordUseCase implements IUseCase<ForgotPasswordDTO, ForgotPasswordOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly mailProvider: IMailProvider,
    private readonly auditLogger: IAuditLogger,
    private readonly resetUrlBase: string,
  ) {}

  async execute({ email }: ForgotPasswordDTO): Promise<ForgotPasswordOutput> {
    const user = await this.userRepository.findByEmail(email.trim().toLowerCase());
    const eligible = user !== null && user.active && !user.guest;

    if (eligible) await this.issueReset(user);

    await this.auditLogger.log({ actorId: null, action: 'auth.password.reset.requested', entity: 'users', entityId: user?.id ?? null });

    return { message: MESSAGE };
  }

  private async issueReset(user: User): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.passwordResetRepository.replaceForUser({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });

    this.mailProvider.send({ to: user.email!, ...buildPasswordResetEmail(`${this.resetUrlBase}?token=${token}`) }).catch(() => undefined);
  }
}
