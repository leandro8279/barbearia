import {
  AdminServiceFilters,
  AdminServiceItem,
  IServiceRepository,
} from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';
import { ServiceEntity } from '@/modules/catalog/infra/database/typeorm/entities/ServiceEntity';

import { PaginationParams } from '@/shared/types/pagination.types';
import { getSkip } from '@/shared/utils/pagination';

import { DataSource, Repository } from 'typeorm';

export class TypeOrmServiceRepository implements IServiceRepository {
  private readonly repository: Repository<ServiceEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ServiceEntity);
  }

  async findAdminPage(
    { search, categoryId, active, sortField, direction }: AdminServiceFilters,
    pagination: PaginationParams,
  ): Promise<{ items: AdminServiceItem[]; total: number }> {
    const qb = this.repository.createQueryBuilder('service');

    if (search) {
      const escaped = search.toLowerCase().replace(/[\\%_]/g, '\\$&');
      qb.andWhere("LOWER(service.name) LIKE :search ESCAPE '\\'", { search: `%${escaped}%` });
    }
    if (categoryId !== undefined) qb.andWhere('service.categoryId = :categoryId', { categoryId });
    if (active !== undefined) qb.andWhere('service.active = :active', { active });

    // sortField vem de whitelist (SERVICE_SORT_FIELDS), validada no controller.
    const [entities, total] = await qb
      .orderBy(`service.${sortField}`, direction === 'desc' ? 'DESC' : 'ASC')
      .addOrderBy('service.id', 'ASC')
      .skip(getSkip(pagination))
      .take(pagination.limit)
      .getManyAndCount();

    return { items: entities.map(TypeOrmServiceRepository.toItem), total };
  }

  private static toItem(e: ServiceEntity): AdminServiceItem {
    return {
      id: e.id,
      name: e.name,
      slug: e.slug,
      categoryId: e.categoryId,
      description: e.description ?? '',
      durationMin: e.durationMin,
      bufferMin: e.bufferMin,
      price: e.price,
      commissionPct: e.commissionPct,
      active: e.active,
      featured: e.featured,
    };
  }
}
