import {
  toUpdateAdminCustomerResponse,
  UpdateAdminCustomerDTO,
  UpdateAdminCustomerResponseDTO,
} from '@/modules/customers/application/dtos/UpdateAdminCustomerDTO';
import { CustomerPhoneAlreadyExistsError } from '@/modules/customers/application/errors/CustomerPhoneAlreadyExistsError';
import { ICustomerRepository } from '@/modules/customers/domain/repositories/CustomerRepositoryInterface';
import { CpfAlreadyExistsError, EmailAlreadyExistsError, IUserRepository, PhoneAlreadyExistsError, User } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { normalizeCpf } from '@/shared/utils/cpf';
import { normalizePhone } from '@/shared/utils/phone';

export type UpdateAdminCustomerError =
  | NotFoundError
  | CustomerPhoneAlreadyExistsError
  | EmailAlreadyExistsError
  | PhoneAlreadyExistsError
  | CpfAlreadyExistsError;
export type UpdateAdminCustomerOutput = Either<UpdateAdminCustomerError, UpdateAdminCustomerResponseDTO>;

const MAX_TAGS = 12;

export class UpdateAdminCustomerUseCase implements IUseCase<UpdateAdminCustomerDTO, UpdateAdminCustomerOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, actorId, tags, consent, ...data }: UpdateAdminCustomerDTO): Promise<UpdateAdminCustomerOutput> {
    const customer = await this.userRepository.findById(id);
    if (!customer || customer.role !== 'customer') return left(new NotFoundError('Cliente'));

    const phone = normalizePhone(data.phone) ?? data.phone.replace(/\D/g, '');

    const duplicate = await this.customerRepository.findByPhoneAndCustomerId(phone, customer.id);
    if (duplicate) return left(new CustomerPhoneAlreadyExistsError({ id: duplicate.id, name: duplicate.name }));

    customer.updateCustomerProfile({
      name: data.name,
      phone,
      email: data.email?.trim().toLowerCase() || null,
      cpf: normalizeCpf(data.cpf ?? '') || null,
      birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00.000Z`) : null,
      referralSource: data.referralSource?.trim() || null,
      tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, MAX_TAGS),
      consent: { ...consent, at: new Date() },
    });

    let saved: User;
    try {
      saved = await this.userRepository.update(customer);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError || error instanceof PhoneAlreadyExistsError || error instanceof CpfAlreadyExistsError) {
        return left(error);
      }
      throw error;
    }

    await this.auditLogger.log({ actorId, action: 'customer.update', entity: 'users', entityId: saved.id });

    return right(toUpdateAdminCustomerResponse(saved));
  }
}
