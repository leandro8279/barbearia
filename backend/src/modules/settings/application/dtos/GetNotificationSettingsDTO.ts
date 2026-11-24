import type {
  NotificationChannel,
  NotificationLogEntry,
  NotificationStatus,
  NotificationType,
} from '@/modules/settings/domain/entities/Notification';
import type { MessageTemplates } from '@/modules/settings/domain/entities/MessageTemplates';
import type { NotificationSettings, QuietHours } from '@/modules/settings/domain/entities/NotificationSettings';

export interface NotificationSettingsDTO {
  events: Record<NotificationType, boolean>;
  channels: Record<NotificationChannel, boolean>;
  quietHours: QuietHours;
  retentionDays: number;
  reminders: boolean;
  reminderHours: number[];
}

export interface NotificationLogItemDTO {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  scheduledAt: string;
  sentAt: string | null;
  readyAt: string | null;
  resendOf: string | null;
  sentFrom: string | null;
  message: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  appointmentStart: string | null;
  barberName: string;
}

export interface GetNotificationSettingsResponseDTO {
  settings: NotificationSettingsDTO;
  templates: Record<NotificationType, string>;
  notifications: NotificationLogItemDTO[];
}

export function toNotificationLogItem(entry: NotificationLogEntry): NotificationLogItemDTO {
  return {
    id: entry.id,
    userId: entry.userId,
    appointmentId: entry.appointmentId,
    type: entry.type,
    channel: entry.channel,
    status: entry.status,
    scheduledAt: entry.scheduledAt.toISOString(),
    sentAt: entry.sentAt?.toISOString() ?? null,
    readyAt: entry.readyAt?.toISOString() ?? null,
    resendOf: entry.resendOf,
    sentFrom: entry.sentFrom,
    message: entry.message,
    customerName: entry.customerName,
    customerPhone: entry.customerPhone,
    customerEmail: entry.customerEmail,
    appointmentStart: entry.appointmentStart?.toISOString() ?? null,
    barberName: entry.barberName,
  };
}

export function toGetNotificationSettingsResponse(
  settings: NotificationSettings,
  templates: MessageTemplates,
  notifications: NotificationLogEntry[],
): GetNotificationSettingsResponseDTO {
  return {
    settings: {
      events: settings.events,
      channels: settings.channels,
      quietHours: settings.quietHours,
      retentionDays: settings.retentionDays,
      reminders: settings.reminders,
      reminderHours: settings.reminderHours,
    },
    templates: templates.byType,
    notifications: notifications.map(toNotificationLogItem),
  };
}
