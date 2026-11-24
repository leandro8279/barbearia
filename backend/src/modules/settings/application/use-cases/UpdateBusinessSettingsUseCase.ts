import { GetBusinessSettingsResponseDTO, toGetBusinessSettingsResponse } from '@/modules/settings/application/dtos/GetBusinessSettingsDTO';
import { UpdateBusinessSettingsDTO } from '@/modules/settings/application/dtos/UpdateBusinessSettingsDTO';
import { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';
import { ISettingsRepository } from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type UpdateBusinessSettingsOutput = Either<NotFoundError, GetBusinessSettingsResponseDTO>;

export class UpdateBusinessSettingsUseCase implements IUseCase<UpdateBusinessSettingsDTO, UpdateBusinessSettingsOutput> {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly settingsRepository: ISettingsRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({
    actorId,
    name,
    cnpj,
    email,
    socials,
    photos,
    amenities,
    ...profile
  }: UpdateBusinessSettingsDTO): Promise<UpdateBusinessSettingsOutput> {
    const unit = await this.unitRepository.findPrimary();
    if (!unit) return left(new NotFoundError('Unidade'));

    const business = (await this.settingsRepository.findBusinessByUnitId(unit.id)) ?? BusinessSettings.defaultFor(unit.id);

    unit.updateProfile({
      ...profile,
      name,
      photos: photos.filter(Boolean),
      amenities: [...new Set(amenities.filter(Boolean))],
    });
    business.updateInfo({ name, cnpj, email, socials });

    await this.settingsRepository.saveBusiness(unit, business);

    await this.auditLogger.log({ actorId, action: 'settings.business.update', entity: 'units', entityId: unit.id });

    return right(toGetBusinessSettingsResponse(unit, business));
  }
}
