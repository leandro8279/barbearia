import {
    SaveNotificationSettingsDTO, SaveNotificationSettingsResponseDTO,
    toSaveNotificationSettingsResponse
} from '@/modules/settings/application/dtos/SaveNotificationSettingsDTO';
import { NotificationSettings } from '@/modules/settings/domain/entities/NotificationSettings';
import {
    ISettingsRepository
} from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type SaveNotificationSettingsOutput = Either<NotFoundError, SaveNotificationSettingsResponseDTO>;

export class SaveNotificationSettingsUseCase implements IUseCase<SaveNotificationSettingsDTO, SaveNotificationSettingsOutput> {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly settingsRepository: ISettingsRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ actorId, templates, ...config }: SaveNotificationSettingsDTO): Promise<SaveNotificationSettingsOutput> {
    const unit = await this.unitRepository.findPrimary();
    if (!unit) return left(new NotFoundError('Unidade'));

    const settings = NotificationSettings.create(config);
    const settingsId = await this.settingsRepository.saveNotifications(unit.id, settings, templates);

    await this.auditLogger.log({ actorId, action: 'settings.notifications.update', entity: 'settings', entityId: settingsId });

    return right(toSaveNotificationSettingsResponse(settings));
  }
}
