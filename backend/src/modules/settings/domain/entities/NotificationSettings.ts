import type { NotificationChannel, NotificationType } from '@/modules/settings/domain/entities/Notification';

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface NotificationSettingsProps {
  events: Record<NotificationType, boolean>;
  channels: Record<NotificationChannel, boolean>;
  quietHours: QuietHours;
  retentionDays: number;
}

export interface StoredNotificationSettings {
  events?: Partial<Record<NotificationType, boolean>>;
  channels?: Partial<Record<NotificationChannel, boolean>>;
  quietHours?: Partial<QuietHours>;
  retentionDays?: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsProps = {
  events: { confirmation: true, reminder24: true, reminder2: true, post: true },
  channels: { whatsapp: true, email: false },
  quietHours: { enabled: true, start: '22:00', end: '08:00' },
  retentionDays: 180,
};

export const REMINDER_HOURS = [24, 2] as const;

export class NotificationSettings {
  private constructor(private readonly props: NotificationSettingsProps) {}

  static create(props: NotificationSettingsProps): NotificationSettings {
    return new NotificationSettings({
      events: { ...props.events },
      channels: { ...props.channels },
      quietHours: { ...props.quietHours },
      retentionDays: props.retentionDays,
    });
  }

  static defaults(): NotificationSettings {
    return NotificationSettings.restore();
  }

  static restore(stored: StoredNotificationSettings = {}): NotificationSettings {
    const defaults = DEFAULT_NOTIFICATION_SETTINGS;

    return new NotificationSettings({
      events: { ...defaults.events, ...stored.events },
      channels: { ...defaults.channels, ...stored.channels },
      quietHours: { ...defaults.quietHours, ...stored.quietHours },
      retentionDays: stored.retentionDays ?? defaults.retentionDays,
    });
  }

  get events(): Record<NotificationType, boolean> {
    return { ...this.props.events };
  }

  get channels(): Record<NotificationChannel, boolean> {
    return { ...this.props.channels };
  }

  get quietHours(): QuietHours {
    return { ...this.props.quietHours };
  }

  get retentionDays(): number {
    return this.props.retentionDays;
  }

  get reminders(): boolean {
    return this.props.events.reminder24 || this.props.events.reminder2;
  }

  get reminderHours(): number[] {
    return [...REMINDER_HOURS];
  }
}

export type NotificationEvents = Record<NotificationType, boolean>;
export type NotificationChannels = Record<NotificationChannel, boolean>;
export type NotificationTemplates = Record<NotificationType, string>;

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface NotificationSettingsProps {
  events: NotificationEvents;
  channels: NotificationChannels;
  quietHours: QuietHours;
  retentionDays: number;
}
