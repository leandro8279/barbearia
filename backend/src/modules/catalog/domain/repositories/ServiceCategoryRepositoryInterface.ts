import type { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';

export interface IServiceCategoryRepository {
  findById(id: string): Promise<ServiceCategory | null>;
}
