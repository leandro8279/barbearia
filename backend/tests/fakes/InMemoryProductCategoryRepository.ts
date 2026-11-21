import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';
import { IProductCategoryRepository } from '@/modules/catalog/domain/repositories/ProductCategoryRepositoryInterface';

export class InMemoryProductCategoryRepository implements IProductCategoryRepository {
  items: ProductCategory[] = [];

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
}
