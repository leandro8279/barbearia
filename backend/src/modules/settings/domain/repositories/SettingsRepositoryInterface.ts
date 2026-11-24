import type { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';
import { Unit } from '@/modules/settings/domain/entities/Unit';

import type { NotificationType } from '@/modules/settings/domain/entities/Notification';
import type { NotificationSettings, NotificationTemplates } from '@/modules/settings/domain/entities/NotificationSettings';

export interface ISettingsRepository {
  findBusinessByUnitId(unitId: string): Promise<BusinessSettings | null>;
  saveBusiness(unit: Unit, business: BusinessSettings): Promise<void>;
  findNotificationsByUnitId(unitId: string): Promise<NotificationSettings | null>;
  saveNotifications(unitId: string, settings: NotificationSettings, templates: NotificationTemplates): Promise<string>;
  findTemplate(type: NotificationType): Promise<string | null>;
}
