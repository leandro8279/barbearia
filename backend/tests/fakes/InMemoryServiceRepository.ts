import { Service } from '@/modules/catalog/domain/entities/Service';
import { IServiceRepository, ServiceFilters } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { PaginationParams } from '@/shared/types/pagination.types';
import { getSkip } from '@/shared/utils/pagination';

export class InMemoryServiceRepository implements IServiceRepository {
  items: Service[] = [];

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findPage({ search, categoryId, active }: ServiceFilters, pagination: PaginationParams) {
    const filtered = this.items.filter(
      (s) =>
        (!search || s.name.toLowerCase().includes(search.toLowerCase())) &&
        (categoryId === undefined || s.categoryId === categoryId) &&
        (active === undefined || s.active === active),
    );

    return { items: filtered.slice(getSkip(pagination), getSkip(pagination) + pagination.limit), total: filtered.length };
  }

  async updateActive(_service: Service) {
    // o fake guarda a mesma referência, então a mutação do domínio já vale
  }
}
