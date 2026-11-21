import { LoginDTO } from '@/modules/auth/application/dtos/LoginDTO';
import { LoginResponseDTO, toLoginResponse } from '@/modules/auth/application/dtos/LoginResponseDTO';
import { InvalidCredentialsError } from '@/modules/auth/application/errors/InvalidCredentialsError';
import { UserInactiveError } from '@/modules/auth/application/errors/UserInactiveError';
import { IUserRepository, User } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { IHashProvider } from '@/shared/providers/hash/HashProviderInterface';
import { IRateLimiter } from '@/shared/providers/rate-limiter/RateLimiterInterface';
import { ITokenProvider } from '@/shared/providers/token/TokenProviderInterface';
import { normalizePhone } from '@/shared/utils/phone';

export type LoginError = InvalidCredentialsError | UserInactiveError;
export type LoginOutput = Either<LoginError, LoginResponseDTO>;

const STAFF_ROLES = new Set(['barber', 'reception', 'manager', 'admin']);
const PHONE_REGEX = /^[+\d\s().-]+$/;

export class LoginUseCase implements IUseCase<LoginDTO, LoginOutput> {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
    private readonly tokenProvider: ITokenProvider,
    private readonly auditLogger: IAuditLogger,
    private readonly failedAttempts: IRateLimiter,
  ) {}

  async execute({ identifier, password, staffOnly = false, ip }: LoginDTO): Promise<LoginOutput> {
    const user = await this.findUser(identifier, staffOnly);

    // Sempre compara um hash, exista o usuário ou não, para não vazar existência pelo tempo de resposta.
    const matches = await this.hashProvider.compare(password, user?.passwordHash ?? (await this.getDummyHash()));

    if (!user || !user.passwordHash || !matches || (staffOnly && !STAFF_ROLES.has(user.role))) {
      await this.failedAttempts.consume(ip ?? 'unknown');
      return left(new InvalidCredentialsError());
    }

    if (!user.active) return left(new UserInactiveError());

    const at = new Date();
    user.recordAccess(at);
    await this.userRepository.touchLastAccess(user.id, at);

    await this.auditLogger.log({ actorId: user.id, action: 'auth.login', entity: 'users', entityId: user.id, details: { staffOnly } });

    const token = this.tokenProvider.sign({ id: user.id, tokenVersion: user.tokenVersion });

    return right(toLoginResponse(user, token));
  }

  private async findUser(identifier: string, staffOnly: boolean): Promise<User | null> {
    const normalized = identifier.trim().toLowerCase();

    const byEmail = await this.userRepository.findByEmail(normalized);
    if (byEmail) return byEmail;
    const phone = staffOnly || !PHONE_REGEX.test(normalized) ? null : normalizePhone(normalized);
     
    return phone ? this.userRepository.findRegisteredByPhone(phone) : null;
  }

  private getDummyHash(): Promise<string> {
    return (this.dummyHash ??= this.hashProvider.hash('auth-comparison-only-not-a-user-password'));
  }
}
