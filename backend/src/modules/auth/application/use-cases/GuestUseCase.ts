import { GuestDTO } from '@/modules/auth/application/dtos/GuestDTO';
import { RegisterResponseDTO, toRegisterResponse } from '@/modules/auth/application/dtos/RegisterResponseDTO';
import { GuestPhoneRegisteredError } from '@/modules/auth/application/errors/GuestPhoneRegisteredError';
import { EmailAlreadyExistsError, IUserRepository, PhoneAlreadyExistsError, User } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { ITokenProvider } from '@/shared/providers/token/TokenProviderInterface';

export type GuestError = GuestPhoneRegisteredError | EmailAlreadyExistsError;
export type GuestOutput = Either<GuestError, { created: boolean; auth: RegisterResponseDTO }>;

export class GuestUseCase implements IUseCase<GuestDTO, GuestOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenProvider: ITokenProvider,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute(input: GuestDTO): Promise<GuestOutput> {
    const phone = input.phone.replace(/\D/g, '');
    const email = input.email?.trim().toLowerCase() || null;

    if (await this.userRepository.findRegisteredByPhone(phone)) return left(new GuestPhoneRegisteredError());

    let guest = await this.userRepository.findGuestByPhone(phone);
    let created = false;

    if (!guest) {
      try {
        guest = await this.userRepository.create(
          User.create({
            name: input.name,
            email,
            phone,
            guest: true,
            consent: { reminders: input.reminders, marketing: false, at: new Date() },
          }),
        );
        created = true;
      } catch (error) {
        if (error instanceof EmailAlreadyExistsError) return left(error);
        if (!(error instanceof PhoneAlreadyExistsError)) throw error;

        // Requisição concorrente criou o guest (ou a conta) no meio do caminho.
        guest = await this.userRepository.findGuestByPhone(phone);
        if (!guest) return left(new GuestPhoneRegisteredError());
      }
    }

    if (created) {
      await this.auditLogger.log({
        actorId: null,
        action: 'auth.guest.create',
        entity: 'users',
        entityId: guest.id,
        details: { phoneLastDigits: phone.slice(-4) },
      });
    }

    const token = this.tokenProvider.sign({ id: guest.id, tokenVersion: guest.tokenVersion });

    return right({ created, auth: toRegisterResponse(guest, token) });
  }
}
