import {
  GetAdminServiceDTO,
  GetAdminServiceResponseDTO,
  toGetAdminServiceResponse,
} from '@/modules/catalog/application/dtos/GetAdminServiceDTO';
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
    const service = await this.serviceRepository.findById(id);
    if (!service) return left(new NotFoundError('Serviço'));

    const barbers = await this.barberRepository.findActive();

    return right(toGetAdminServiceResponse(service, barbers));
  }
}
