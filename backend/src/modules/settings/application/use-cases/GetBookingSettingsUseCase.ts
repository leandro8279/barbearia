import { GetBookingSettingsResponseDTO, toGetBookingSettingsResponse } from '@/modules/settings/application/dtos/GetBookingSettingsDTO';
import { BookingSettings } from '@/modules/settings/domain/entities/BookingSettings';
import { ISettingsRepository } from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetBookingSettingsUseCase implements IUseCase<void, GetBookingSettingsResponseDTO> {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly settingsRepository: ISettingsRepository,
  ) {}

  async execute(): Promise<GetBookingSettingsResponseDTO> {
    const unit = await this.unitRepository.findPrimary();
    const settings = unit ? await this.settingsRepository.findBookingByUnitId(unit.id) : null;

    return toGetBookingSettingsResponse(settings ?? BookingSettings.defaults());
  }
}
