import { Service } from '@/modules/catalog/domain/entities/Service';
import { IServiceRepository, ServiceFilters } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';
import { ServiceSlugAlreadyExistsError } from '@/modules/catalog/application/errors/ServiceSlugAlreadyExistsError';
import { ServiceBarberAssignment } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';
import { PaginationParams } from '@/shared/types/pagination.types';
import { getSkip } from '@/shared/utils/pagination';

export class InMemoryServiceRepository implements IServiceRepository {
  items: Service[] = [];

  assignments: Array<ServiceBarberAssignment & { serviceId: string }> = [];

async findBySlug(slug: string) {
  return this.items.find((item) => item.slug === slug) ?? null;
}

async create(service: Service, assignments: ServiceBarberAssignment[]) {
  if (this.items.some((item) => item.slug === service.slug)) throw new ServiceSlugAlreadyExistsError();

  this.items.push(service);
  this.assignments.push(...assignments.map((assignment) => ({ serviceId: service.id, ...assignment })));
}
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
