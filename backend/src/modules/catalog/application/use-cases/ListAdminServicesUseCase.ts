import { ListAdminServicesDTO, ListAdminServicesResponseDTO } from '@/modules/catalog/application/dtos/ListAdminServicesDTO';
import { IServiceRepository } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListAdminServicesUseCase implements IUseCase<ListAdminServicesDTO, ListAdminServicesResponseDTO> {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute({ page, pageSize, ...filters }: ListAdminServicesDTO): Promise<ListAdminServicesResponseDTO> {
    const { items, total } = await this.serviceRepository.findAdminPage(filters, { page, limit: pageSize });

    return { items, total, page, pageSize };
  }
}
