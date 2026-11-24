import { Notification } from '@/modules/settings/domain/entities/Notification';
import { NotificationEntity } from '@/modules/settings/infra/entities/NotificationEntity';

export class NotificationMapper {
  static toDomain(entity: NotificationEntity): Notification {
    return Notification.restore({
      id: entity.id,
      userId: entity.userId,
      appointmentId: entity.appointmentId,
      type: entity.type,
      channel: entity.channel,
      status: entity.status,
      scheduledAt: entity.scheduledAt,
      readyAt: entity.readyAt,
      sentAt: entity.sentAt,
      message: entity.message ?? '',
      resendOf: entity.resendOf,
      createdAt: entity.createdAt,
    });
  }

  static toPersistence(notification: Notification): NotificationEntity {
    return {
      id: notification.id,
      userId: notification.userId,
      appointmentId: notification.appointmentId,
      type: notification.type,
      channel: notification.channel,
      status: notification.status,
      scheduledAt: notification.scheduledAt,
      readyAt: notification.readyAt,
      sentAt: notification.sentAt,
      message: notification.message,
      resendOf: notification.resendOf,
      createdAt: notification.createdAt,
    };
  }
}
