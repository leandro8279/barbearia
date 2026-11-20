import { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';
import { IServiceCategoryRepository } from '@/modules/catalog/domain/repositories/ServiceCategoryRepositoryInterface';
import { ServiceCategoryEntity } from '@/modules/catalog/infra/entities/ServiceCategoryEntity';
import { ServiceCategoryMapper } from '@/modules/catalog/infra/mappers/ServiceCategoryMapper';

import { DataSource, Repository } from 'typeorm';

export class TypeOrmServiceCategoryRepository implements IServiceCategoryRepository {
  private readonly repository: Repository<ServiceCategoryEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ServiceCategoryEntity);
  }

  async findById(id: string): Promise<ServiceCategory | null> {
    const entity = await this.repository.findOneBy({ id });

    return entity ? ServiceCategoryMapper.toDomain(entity) : null;
  }
}
