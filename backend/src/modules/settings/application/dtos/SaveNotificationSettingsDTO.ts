import type { NotificationSettings, NotificationSettingsProps, NotificationTemplates } from '@/modules/settings/domain/entities/NotificationSettings';

export interface SaveNotificationSettingsDTO extends NotificationSettingsProps {
  templates: NotificationTemplates;
  actorId: string;
}

export interface SaveNotificationSettingsResponseDTO extends NotificationSettingsProps {
  reminders: boolean;
  reminderHours: number[];
}

export function toSaveNotificationSettingsResponse(settings: NotificationSettings): SaveNotificationSettingsResponseDTO {
  return {
    events: settings.events,
    channels: settings.channels,
    quietHours: settings.quietHours,
    retentionDays: settings.retentionDays,
    reminders: settings.reminders,
    reminderHours: settings.reminderHours,
  };
}
