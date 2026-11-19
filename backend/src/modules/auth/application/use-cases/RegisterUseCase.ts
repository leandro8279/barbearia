import { RegisterDTO } from '@/modules/auth/application/dtos/RegisterDTO';
import { RegisterResponseDTO, toRegisterResponse } from '@/modules/auth/application/dtos/RegisterResponseDTO';
import { EmailAlreadyExistsError, IUserRepository, PhoneAlreadyExistsError, User } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { IHashProvider } from '@/shared/providers/hash/HashProviderInterface';
import { ITokenProvider } from '@/shared/providers/token/TokenProviderInterface';

export type RegisterError = EmailAlreadyExistsError | PhoneAlreadyExistsError;
export type RegisterOutput = Either<RegisterError, { created: boolean; auth: RegisterResponseDTO }>;

export class RegisterUseCase implements IUseCase<RegisterDTO, RegisterOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
    private readonly tokenProvider: ITokenProvider,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(input: RegisterDTO): Promise<RegisterOutput> {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.replace(/\D/g, '');

    const [emailOwner, phoneGuest] = await Promise.all([this.userRepository.findByEmail(email), this.userRepository.findGuestByPhone(phone)]);

    if (emailOwner && emailOwner.id !== phoneGuest?.id) return left(new EmailAlreadyExistsError());

    const phoneOwner = await this.userRepository.findRegisteredByPhone(phone);
    if (phoneOwner && phoneOwner.id !== emailOwner?.id) return left(new PhoneAlreadyExistsError());

    const passwordHash = await this.hashProvider.hash(input.password);
    const birthDate = input.birthDate ? new Date(`${input.birthDate}T00:00:00.000Z`) : null;
    const consent = { reminders: input.reminders, marketing: false, at: new Date() };

    let user: User | null;

    try {
      user = phoneGuest
        ? await this.promoteGuest(phoneGuest, { name: input.name, email, phone, passwordHash, birthDate, consent })
        : await this.userRepository.create(User.create({ name: input.name, email, phone, passwordHash, birthDate, consent }));
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError || error instanceof PhoneAlreadyExistsError) return left(error);
      throw error;
    }

    if (!user) return left(new PhoneAlreadyExistsError());

    const token = this.tokenProvider.sign({ id: user.id, tokenVersion: user.tokenVersion });

    await this.auditLogger.log({
      actorId: user.id,
      action: 'auth.register',
      entity: 'users',
      entityId: user.id,
      details: { email, guestPromoted: Boolean(phoneGuest) },
    });

    return right({ created: !phoneGuest, auth: toRegisterResponse(user, token) });
  }

  private promoteGuest(guest: User, data: Parameters<User['completeRegistration']>[0]): Promise<User | null> {
    guest.completeRegistration(data);

    return this.userRepository.promoteGuest(guest);
  }
}
