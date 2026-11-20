import { GetAdminServiceDTO, GetAdminServiceResponseDTO } from '@/modules/catalog/application/dtos/GetAdminServiceDTO';
import { IBarberRepository } from '@/modules/catalog/domain/repositories/BarberRepositoryInterface';
import { IServiceRepository } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export type GetAdminServiceOutput = Either<NotFoundError, GetAdminServiceResponseDTO>;

export class GetAdminServiceUseCase implements IUseCase<GetAdminServiceDTO, GetAdminServiceOutput> {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly barberRepository: IBarberRepository,
  ) {}

  async execute({ id }: GetAdminServiceDTO): Promise<GetAdminServiceOutput> {
    const service = await this.serviceRepository.findAdminById(id);
    if (!service) return left(new NotFoundError('Serviço'));

    const barbers = await this.barberRepository.findActiveForAdmin();

    const barberAssignments = barbers
      .map((barber) => {
        const link = barber.serviceLinks.find((item) => item.serviceId === service.id);

        return {
          barberId: barber.id,
          name: barber.name,
          photo: barber.photo,
          assigned: Boolean(link) || barber.serviceLinks.length === 0,
          commissionPct: link?.commissionPct ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return right({ ...service, barberAssignments });
  }
}
