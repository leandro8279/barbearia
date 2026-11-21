import type { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';

export interface IProductCategoryRepository {
  findById(id: string): Promise<ProductCategory | null>;
}
