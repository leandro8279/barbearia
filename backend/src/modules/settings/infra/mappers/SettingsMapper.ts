import { BusinessSettings, DEFAULT_TIMEZONE } from '@/modules/settings/domain/entities/BusinessSettings';
import { BusinessJson, SettingsEntity } from '@/modules/settings/infra/entities/SettingsEntity';

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
}
