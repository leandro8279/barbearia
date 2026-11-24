import type { NotificationLogEntry } from '@/modules/settings/domain/entities/Notification';
import type { Notification } from '@/modules/settings/domain/entities/Notification';

export interface NotificationAppointmentContext {
  start: Date;
  barberName: string;
}

export interface INotificationRepository {
  create(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findRecent(limit: number): Promise<NotificationLogEntry[]>;
  findAppointmentContext(appointmentId: string): Promise<NotificationAppointmentContext | null>;
}
