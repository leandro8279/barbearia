import {
    GetNotificationSettingsResponseDTO, toGetNotificationSettingsResponse
} from '@/modules/settings/application/dtos/GetNotificationSettingsDTO';
import { MessageTemplates } from '@/modules/settings/domain/entities/MessageTemplates';
import { NotificationSettings } from '@/modules/settings/domain/entities/NotificationSettings';
import {
    IMessageTemplateRepository
} from '@/modules/settings/domain/repositories/MessageTemplateRepositoryInterface';
import {
    INotificationRepository
} from '@/modules/settings/domain/repositories/NotificationRepositoryInterface';
import {
    ISettingsRepository
} from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

const RECENT_NOTIFICATIONS_LIMIT = 100;

export class GetNotificationSettingsUseCase implements IUseCase<void, GetNotificationSettingsResponseDTO> {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly settingsRepository: ISettingsRepository,
    private readonly templateRepository: IMessageTemplateRepository,
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(): Promise<GetNotificationSettingsResponseDTO> {
    const unit = await this.unitRepository.findPrimary();

    const [settings, savedTemplates, notifications] = await Promise.all([
      unit ? this.settingsRepository.findNotificationsByUnitId(unit.id) : null,
      this.templateRepository.findTextsByType(),
      this.notificationRepository.findRecent(RECENT_NOTIFICATIONS_LIMIT),
    ]);

    return toGetNotificationSettingsResponse(settings ?? NotificationSettings.defaults(), MessageTemplates.resolve(savedTemplates), notifications);
  }
}
