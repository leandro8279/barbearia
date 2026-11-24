import { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';
import { Unit } from '@/modules/settings/domain/entities/Unit';
import { ISettingsRepository } from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { SettingsEntity } from '@/modules/settings/infra/entities/SettingsEntity';
import { UnitEntity } from '@/modules/settings/infra/entities/UnitEntity';
import { SettingsMapper } from '@/modules/settings/infra/mappers/SettingsMapper';
import { UnitMapper } from '@/modules/settings/infra/mappers/UnitMapper';

import { randomUUID } from 'crypto';
import { DataSource, QueryDeepPartialEntity, Repository } from 'typeorm';

export class TypeOrmSettingsRepository implements ISettingsRepository {
  private readonly repository: Repository<SettingsEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(SettingsEntity);
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
}
