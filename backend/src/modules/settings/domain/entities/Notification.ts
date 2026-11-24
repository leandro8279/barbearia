export const NOTIFICATION_TYPES = ['confirmation', 'reminder24', 'reminder2', 'post'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['whatsapp', 'email'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ['scheduled', 'ready', 'sent', 'canceled'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

import { randomUUID } from 'node:crypto';

export interface NotificationLogEntry {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  readyAt: Date | null;
  resendOf: string | null;
  sentFrom: string | null;
  message: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  appointmentStart: Date | null;
  barberName: string;
}

export interface NotificationProps {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  scheduledAt: Date | null;
  readyAt: Date | null;
  sentAt: Date | null;
  message: string;
  resendOf: string | null;
  createdAt: Date;
}

export class Notification {
  private constructor(private readonly props: NotificationProps) {}

  static restore(props: NotificationProps): Notification {
    return new Notification({ ...props });
  }

  prepareResend({ message, at }: { message: string; at: Date }): Notification {
    return new Notification({
      ...this.props,
      id: randomUUID(),
      status: 'ready',
      scheduledAt: at,
      readyAt: at,
      sentAt: null,
      resendOf: this.props.id,
      message,
      createdAt: at,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get appointmentId(): string | null {
    return this.props.appointmentId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get channel(): NotificationChannel {
    return this.props.channel;
  }

  get status(): NotificationStatus {
    return this.props.status;
  }

  get scheduledAt(): Date | null {
    return this.props.scheduledAt;
  }

  get readyAt(): Date | null {
    return this.props.readyAt;
  }

  get sentAt(): Date | null {
    return this.props.sentAt;
  }

  get message(): string {
    return this.props.message;
  }

  get resendOf(): string | null {
    return this.props.resendOf;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
