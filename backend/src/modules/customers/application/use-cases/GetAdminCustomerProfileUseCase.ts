import {
    CustomerProfileAccess, GetAdminCustomerProfileDTO, GetAdminCustomerProfileResponseDTO,
    toGetAdminCustomerProfileResponse
} from '@/modules/customers/application/dtos/GetAdminCustomerProfileDTO';
import {
    ICustomerAppointmentRepository
} from '@/modules/customers/domain/repositories/CustomerAppointmentRepositoryInterface';
import {
    ICustomerHistoryRepository
} from '@/modules/customers/domain/repositories/CustomerHistoryRepositoryInterface';
import {
    ICustomerNoteRepository
} from '@/modules/customers/domain/repositories/CustomerNoteRepositoryInterface';
import {
    ICustomerTabRepository
} from '@/modules/customers/domain/repositories/CustomerTabRepositoryInterface';
import { computeCustomerMetrics } from '@/modules/customers/domain/services/customerMetrics';
import { IUserRepository } from '@/modules/users';

import { hasPermission } from '@/shared/auth/hasPermission';
import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export type GetAdminCustomerProfileOutput = Either<NotFoundError, GetAdminCustomerProfileResponseDTO>;

export class GetAdminCustomerProfileUseCase implements IUseCase<GetAdminCustomerProfileDTO, GetAdminCustomerProfileOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly appointmentRepository: ICustomerAppointmentRepository,
    private readonly tabRepository: ICustomerTabRepository,
    private readonly noteRepository: ICustomerNoteRepository,
  ) {}

  async execute({ id, viewer }: GetAdminCustomerProfileDTO): Promise<GetAdminCustomerProfileOutput> {
    const customer = await this.userRepository.findById(id);
    if (!customer || customer.role !== 'customer') return left(new NotFoundError('Cliente'));

    const access: CustomerProfileAccess = {
      edit: hasPermission(viewer, 'customers.write'),
      history: hasPermission(viewer, 'agenda.read'),
      financial: hasPermission(viewer, 'cash.read'),
      schedule: hasPermission(viewer, 'agenda.write'),
    };

    const scope = viewer.role === 'barber' ? { barberUserId: viewer.id } : {};

    const [visitDates, closedTabs, appointments, notes] = await Promise.all([
      this.appointmentRepository.findDoneVisitDates(id),
      this.tabRepository.findClosedByCustomer(id),
      access.history ? this.appointmentRepository.findByCustomer(id, scope) : [],
      access.edit ? this.noteRepository.findByCustomer(id) : [],
    ]);

    const metrics = computeCustomerMetrics(
      visitDates,
      closedTabs.map((tab) => tab.totalCents),
    );

    return right(
      toGetAdminCustomerProfileResponse({
        customer,
        access,
        metrics,
        appointments,
        financial: access.financial ? closedTabs : [],
        notes,
      }),
    );
  }
}
