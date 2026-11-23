import {
  CreateAdminCustomerDTO,
  CreateAdminCustomerResponseDTO,
  toCreateAdminCustomerResponse,
} from '@/modules/customers/application/dtos/CreateAdminCustomerDTO';
import { CustomerPhoneAlreadyExistsError } from '@/modules/customers/application/errors/CustomerPhoneAlreadyExistsError';
import { ICustomerRepository } from '@/modules/customers/domain/repositories/CustomerRepositoryInterface';
import { CpfAlreadyExistsError, EmailAlreadyExistsError, IUserRepository, PhoneAlreadyExistsError, User } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { normalizeCpf } from '@/shared/utils/cpf';
import { normalizePhone } from '@/shared/utils/phone';

const MAX_TAGS = 12;

export type CreateAdminCustomerError = CustomerPhoneAlreadyExistsError | EmailAlreadyExistsError | CpfAlreadyExistsError;
export type CreateAdminCustomerOutput = Either<CreateAdminCustomerError, CreateAdminCustomerResponseDTO>;

export class CreateAdminCustomerUseCase implements IUseCase<CreateAdminCustomerDTO, CreateAdminCustomerOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({
    actorId,
    name,
    phone: rawPhone,
    email,
    cpf,
    birthDate,
    referralSource,
    tags,
    consent,
  }: CreateAdminCustomerDTO): Promise<CreateAdminCustomerOutput> {
    const phone = normalizePhone(rawPhone) ?? rawPhone.replace(/\D/g, '');

    const duplicate = await this.customerRepository.findByPhone(phone);
    if (duplicate) return left(new CustomerPhoneAlreadyExistsError(duplicate));

    const customer = User.create({
      name,
      email: email || null,
      phone,
      cpf: cpf ? normalizeCpf(cpf) : null,
      birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null,
      referralSource: referralSource?.trim() || null,
      tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, MAX_TAGS),
      consent: { ...consent, at: new Date() },
    });

    let created: User;

    try {
      created = await this.userRepository.create(customer);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError || error instanceof CpfAlreadyExistsError) return left(error);
      if (error instanceof PhoneAlreadyExistsError) {
        return left(new CustomerPhoneAlreadyExistsError(await this.customerRepository.findByPhone(phone)));
      }
      throw error;
    }

    await this.auditLogger.log({ actorId, action: 'customer.create', entity: 'users', entityId: created.id });

    return right(toCreateAdminCustomerResponse(created));
  }
}
