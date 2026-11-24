import {
    BusinessSettings, DEFAULT_TIMEZONE
} from '@/modules/settings/domain/entities/BusinessSettings';
import { NotificationSettings } from '@/modules/settings/domain/entities/NotificationSettings';
import { BusinessJson, SettingsEntity } from '@/modules/settings/infra/entities/SettingsEntity';
import { BookingSettings } from '@/modules/settings/domain/entities/BookingSettings';

export class SettingsMapper {
  static toBusinessDomain(entity: SettingsEntity): BusinessSettings {
    const business = entity.business ?? {};

    return BusinessSettings.restore({
      unitId: entity.unitId,
      name: business.name ?? '',
      cnpj: business.cnpj ?? '',
      email: business.email ?? '',
      socials: {
        instagram: business.socials?.instagram ?? '',
        facebook: business.socials?.facebook ?? '',
        tiktok: business.socials?.tiktok ?? '',
        website: business.socials?.website ?? '',
      },
      timezone: business.timezone ?? DEFAULT_TIMEZONE,
    });
  }

  static toBusinessPersistence(business: BusinessSettings): BusinessJson {
    return {
      name: business.name,
      cnpj: business.cnpj,
      email: business.email,
      socials: business.socials,
      timezone: business.timezone,
    };
  }

  static toNotificationDomain(entity: SettingsEntity): NotificationSettings {
    return NotificationSettings.restore(entity.notifications ?? {});
  }

  static toNotificationsPersistence(settings: NotificationSettings): Record<string, unknown> {
    return {
      events: settings.events,
      channels: settings.channels,
      quietHours: settings.quietHours,
      retentionDays: settings.retentionDays,
      reminders: settings.reminders,
      reminderHours: settings.reminderHours,
    };
  }

static toBookingDomain(entity: SettingsEntity): BookingSettings {
    return BookingSettings.restore(entity.booking ?? {});
}
}
