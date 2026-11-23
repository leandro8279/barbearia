import { BusinessSettings } from '@/modules/settings/domain/entities/BusinessSettings';
import { ISettingsRepository } from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import { SettingsEntity } from '@/modules/settings/infra/entities/SettingsEntity';
import { SettingsMapper } from '@/modules/settings/infra/mappers/SettingsMapper';

import { DataSource, Repository } from 'typeorm';

export class TypeOrmSettingsRepository implements ISettingsRepository {
  private readonly repository: Repository<SettingsEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(SettingsEntity);
  }

  async findBusinessByUnitId(unitId: string): Promise<BusinessSettings | null> {
    const entity = await this.repository.findOneBy({ unitId });

    return entity ? SettingsMapper.toBusinessDomain(entity) : null;
  }
}
