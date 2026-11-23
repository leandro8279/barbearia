import { Unit } from '@/modules/settings/domain/entities/Unit';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';
import { UnitEntity } from '@/modules/settings/infra/entities/UnitEntity';
import { UnitMapper } from '@/modules/settings/infra/mappers/UnitMapper';

import { DataSource, Repository } from 'typeorm';

export class TypeOrmUnitRepository implements IUnitRepository {
  private readonly repository: Repository<UnitEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(UnitEntity);
  }

  async findPrimary(): Promise<Unit | null> {
    const entity = await this.repository.findOne({ where: {}, order: { createdAt: 'ASC', id: 'ASC' } });

    return entity ? UnitMapper.toDomain(entity) : null;
  }
}
