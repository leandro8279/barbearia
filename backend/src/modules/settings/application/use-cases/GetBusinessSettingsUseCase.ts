import { GetBusinessSettingsResponseDTO, toGetBusinessSettingsResponse } from '@/modules/settings/application/dtos/GetBusinessSettingsDTO';
import { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';
import { ISettingsRepository } from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export type GetBusinessSettingsOutput = Either<NotFoundError, GetBusinessSettingsResponseDTO>;

export class GetBusinessSettingsUseCase implements IUseCase<void, GetBusinessSettingsOutput> {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(): Promise<GetBusinessSettingsOutput> {
    const unit = await this.unitRepository.findPrimary();
    if (!unit) return left(new NotFoundError('Unidade'));

    const business = (await this.settingsRepository.findBusinessByUnitId(unit.id)) ?? BusinessSettings.defaultFor(unit.id);

    return right(toGetBusinessSettingsResponse(unit, business));
  }
}
