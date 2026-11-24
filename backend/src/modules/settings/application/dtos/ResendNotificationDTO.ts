import type { Notification, NotificationChannel, NotificationStatus, NotificationType } from '@/modules/settings/domain/entities/Notification';
import type { NotificationAppointmentContext } from '@/modules/settings/domain/repositories/NotificationRepositoryInterface';
import type { NotificationRecipient } from '@/modules/settings/domain/services/notificationDelivery';

export interface ResendNotificationDTO {
  id: string;
  actorId: string;
}

export interface NotificationListItemDTO {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  scheduledAt: string | null;
  readyAt: string | null;
  sentAt: string | null;
  message: string;
  resendOf: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  appointmentStart: string | null;
  barberName: string;
}

export interface ResendNotificationResponseDTO {
  notification: NotificationListItemDTO;
  url: string;
}

export function toNotificationListItem(
  notification: Notification,
  customer: NotificationRecipient,
  context: NotificationAppointmentContext | null,
): NotificationListItemDTO {
  return {
    id: notification.id,
    userId: notification.userId,
    appointmentId: notification.appointmentId,
    type: notification.type,
    channel: notification.channel,
    status: notification.status,
    scheduledAt: notification.scheduledAt?.toISOString() ?? null,
    readyAt: notification.readyAt?.toISOString() ?? null,
    sentAt: notification.sentAt?.toISOString() ?? null,
    message: notification.message,
    resendOf: notification.resendOf,
    customerName: customer.name || 'Cliente',
    customerPhone: customer.phone ?? '',
    customerEmail: customer.email ?? '',
    appointmentStart: context?.start.toISOString() ?? null,
    barberName: context?.barberName || 'Profissional',
  };
}
