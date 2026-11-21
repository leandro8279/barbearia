import { Product } from '@/modules/catalog/domain/entities/Product';
import { IProductRepository, ProductFilters, ProductSortField } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';
import { ProductEntity } from '@/modules/catalog/infra/entities/ProductEntity';
import { ProductMapper } from '@/modules/catalog/infra/mappers/ProductMapper';

import { PaginationParams } from '@/shared/types/pagination.types';
import { getSkip } from '@/shared/utils/pagination';

import { DataSource, Repository } from 'typeorm';

const SORT_COLUMN: Record<ProductSortField, string> = {
  name: 'product.name',
  sku: 'product.sku',
  categoryId: 'product.categoryId',
  price: 'product.price',
  costCents: 'product.costCents',
  stock: 'product.stock',
};

export class TypeOrmProductRepository implements IProductRepository {
  private readonly repository: Repository<ProductEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProductEntity);
  }

  async findPage(
    { search, categoryId, kind, stock, sortField, direction }: ProductFilters,
    pagination: PaginationParams,
  ): Promise<{ items: Product[]; total: number }> {
    const qb = this.repository.createQueryBuilder('product').innerJoinAndSelect('product.category', 'category');

    if (search) {
      const escaped = search.toLowerCase().replace(/[\\%_]/g, '\\$&');
      qb.andWhere("(LOWER(product.name) LIKE :search ESCAPE '\\' OR LOWER(product.sku) LIKE :search ESCAPE '\\')", { search: `%${escaped}%` });
    }
    if (categoryId !== undefined) qb.andWhere('product.categoryId = :categoryId', { categoryId });
    if (kind !== undefined) qb.andWhere('product.kind = :kind', { kind });
    if (stock === 'low') qb.andWhere('product.stock < product.minStock');
    if (stock === 'ok') qb.andWhere('product.stock >= product.minStock');

    const [entities, total] = await qb
      .orderBy(SORT_COLUMN[sortField], direction === 'desc' ? 'DESC' : 'ASC')
      .addOrderBy('product.id', 'ASC')
      .skip(getSkip(pagination))
      .take(pagination.limit)
      .getManyAndCount();

    return { items: entities.map(ProductMapper.toDomain), total };
  }
}
