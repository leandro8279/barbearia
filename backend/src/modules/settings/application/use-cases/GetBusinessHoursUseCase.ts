import { GetBusinessHoursResponseDTO, toGetBusinessHoursResponse } from '@/modules/settings/application/dtos/GetBusinessHoursDTO';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';
import { buildDefaultHolidays } from '@/modules/settings/domain/services/holidayCalendar';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export type GetBusinessHoursOutput = Either<NotFoundError, GetBusinessHoursResponseDTO>;

export class GetBusinessHoursUseCase implements IUseCase<void, GetBusinessHoursOutput> {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<GetBusinessHoursOutput> {
    const unit = await this.unitRepository.findPrimary();
    if (!unit) return left(new NotFoundError('Unidade'));

    return right(toGetBusinessHoursResponse(unit, buildDefaultHolidays(this.now().getFullYear())));
  }
}
