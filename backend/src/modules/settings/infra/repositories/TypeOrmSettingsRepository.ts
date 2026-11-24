import { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';
import {
    NOTIFICATION_TYPES, NotificationType
} from '@/modules/settings/domain/entities/Notification';
import {
    NotificationSettings, NotificationTemplates
} from '@/modules/settings/domain/entities/NotificationSettings';
import { Unit } from '@/modules/settings/domain/entities/Unit';
import {
    ISettingsRepository
} from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { MessageTemplateEntity } from '@/modules/settings/infra/entities/MessageTemplateEntity';
import { SettingsEntity } from '@/modules/settings/infra/entities/SettingsEntity';
import { UnitEntity } from '@/modules/settings/infra/entities/UnitEntity';
import { SettingsMapper } from '@/modules/settings/infra/mappers/SettingsMapper';
import { UnitMapper } from '@/modules/settings/infra/mappers/UnitMapper';

import { randomUUID } from 'crypto';
import { DataSource, QueryDeepPartialEntity, Repository } from 'typeorm';

export class TypeOrmSettingsRepository implements ISettingsRepository {
  private readonly repository: Repository<SettingsEntity>;
  private readonly templates: Repository<MessageTemplateEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(SettingsEntity);
    this.templates = dataSource.getRepository(MessageTemplateEntity);
  }

  async findBusinessByUnitId(unitId: string): Promise<BusinessSettings | null> {
    const entity = await this.repository.findOneBy({ unitId });

    return entity ? SettingsMapper.toBusinessDomain(entity) : null;
  }

  async saveBusiness(unit: Unit, business: BusinessSettings): Promise<void> {
    const { id, businessHours: _businessHours, holidays: _holidays, ...data } = UnitMapper.toPersistence(unit);
    const businessJson = SettingsMapper.toBusinessPersistence(business);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(UnitEntity, { id }, { ...data, updatedAt: unit.updatedAt } as QueryDeepPartialEntity<UnitEntity>);

      const existing = await manager.findOneBy(SettingsEntity, { unitId: unit.id });

      if (existing) {
        await manager.update(SettingsEntity, { id: existing.id }, { business: businessJson } as QueryDeepPartialEntity<SettingsEntity>);
        return;
      }

      await manager.insert(SettingsEntity, { id: randomUUID(), unitId: unit.id, business: businessJson, booking: {}, notifications: {} });
    });
  }

  async findNotificationsByUnitId(unitId: string): Promise<NotificationSettings | null> {
    const entity = await this.repository.findOneBy({ unitId });

    return entity ? SettingsMapper.toNotificationDomain(entity) : null;
  }

  async findTemplate(type: NotificationType): Promise<string | null> {
    const entity = await this.templates.findOneBy({ type });

    return entity?.text ?? null;
  }

  async saveNotifications(unitId: string, settings: NotificationSettings, templates: NotificationTemplates): Promise<string> {
    const notifications = SettingsMapper.toNotificationsPersistence(settings);

    return this.dataSource.transaction(async (manager) => {
      const current = await manager.findOneBy(SettingsEntity, { unitId });
      let settingsId: string;

      if (current) {
        settingsId = current.id;
        await manager.update(SettingsEntity, { id: current.id }, { notifications });
      } else {
        settingsId = randomUUID();
        await manager.insert(SettingsEntity, { id: settingsId, unitId, business: {}, booking: {}, notifications });
      }

      const existing = new Map((await manager.find(MessageTemplateEntity)).map((template) => [template.type, template]));

      for (const type of NOTIFICATION_TYPES) {
        const template = existing.get(type);

        if (template) await manager.update(MessageTemplateEntity, { id: template.id }, { text: templates[type] });
        else await manager.insert(MessageTemplateEntity, { id: randomUUID(), type, text: templates[type] });
      }

      return settingsId;
    });
  }
}
