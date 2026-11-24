import type { NotificationType } from '@/modules/settings/domain/entities/Notification';

export interface IMessageTemplateRepository {
  findTextsByType(): Promise<Partial<Record<NotificationType, string>>>;
}
