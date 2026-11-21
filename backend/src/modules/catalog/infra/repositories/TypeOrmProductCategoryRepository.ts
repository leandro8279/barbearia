import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';
import { IProductCategoryRepository } from '@/modules/catalog/domain/repositories/ProductCategoryRepositoryInterface';
import { ProductCategoryEntity } from '@/modules/catalog/infra/entities/ProductCategoryEntity';
import { ProductCategoryMapper } from '@/modules/catalog/infra/mappers/ProductCategoryMapper';

import { DataSource, Repository } from 'typeorm';

export class TypeOrmProductCategoryRepository implements IProductCategoryRepository {
  private readonly repository: Repository<ProductCategoryEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProductCategoryEntity);
  }

  async findById(id: string): Promise<ProductCategory | null> {
    const entity = await this.repository.findOneBy({ id });

    return entity ? ProductCategoryMapper.toDomain(entity) : null;
  }
}
