import { ListAdminBarbersResponseDTO, toListAdminBarbersResponse } from '@/modules/catalog/application/dtos/ListAdminBarbersDTO';
import { IBarberRepository } from '@/modules/catalog/domain/repositories/BarberRepositoryInterface';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListAdminBarbersUseCase implements IUseCase<void, ListAdminBarbersResponseDTO> {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(): Promise<ListAdminBarbersResponseDTO> {
    const barbers = await this.barberRepository.findActive();

    return toListAdminBarbersResponse(barbers);
  }
}
