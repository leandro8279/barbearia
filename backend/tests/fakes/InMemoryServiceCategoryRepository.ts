import { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';
import { IServiceCategoryRepository } from '@/modules/catalog/domain/repositories/ServiceCategoryRepositoryInterface';

export class InMemoryServiceCategoryRepository implements IServiceCategoryRepository {
  items: ServiceCategory[] = [];

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
}
