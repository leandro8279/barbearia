import { Product } from '@/modules/catalog/domain/entities/Product';
import { IProductRepository, ProductFilters, ProductSortField } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';
import { ProductEntity } from '@/modules/catalog/infra/entities/ProductEntity';
import { ProductMapper } from '@/modules/catalog/infra/mappers/ProductMapper';
import type { StockMovement } from '@/modules/catalog/domain/entities/StockMovement';
import { StockMovementEntity } from '@/modules/catalog/infra/entities/StockMovementEntity';
import { StockMovementMapper } from '@/modules/catalog/infra/mappers/StockMovementMapper';

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

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(ProductEntity);
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

  async findById(id: string): Promise<Product | null> {
    const entity = await this.repository.findOne({ where: { id }, relations: { category: true } });

    return entity ? ProductMapper.toDomain(entity) : null;
  }
  
  async applyStockAdjustment(movement: StockMovement): Promise<Product | null> {
    return this.dataSource.transaction(async (manager) => {
      // A condição no WHERE garante que o estoque nunca fica negativo, mesmo com requisições concorrentes.
      const result = await manager
        .createQueryBuilder()
        .update(ProductEntity)
        .set({ stock: () => 'stock + :delta' })
        .where('id = :id AND stock + :delta >= 0', { id: movement.productId })
        .setParameter('delta', movement.qty)
        .execute();

      if (!result.affected) return null;

      await manager.insert(StockMovementEntity, StockMovementMapper.toPersistence(movement));

      const entity = await manager.findOne(ProductEntity, { where: { id: movement.productId }, relations: { category: true } });

      return entity ? ProductMapper.toDomain(entity) : null;
    });
  }
}
