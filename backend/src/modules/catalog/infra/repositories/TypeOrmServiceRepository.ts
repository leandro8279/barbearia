import { ServiceSlugAlreadyExistsError } from '@/modules/catalog/application/errors/ServiceSlugAlreadyExistsError';
import { Service } from '@/modules/catalog/domain/entities/Service';
import { IServiceRepository, ServiceFilters, ServiceSortField } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';
import { ServiceEntity } from '@/modules/catalog/infra/entities/ServiceEntity';
import { ServiceMapper } from '@/modules/catalog/infra/mappers/ServiceMapper';

import { PaginationParams } from '@/shared/types/pagination.types';
import { getSkip } from '@/shared/utils/pagination';

import { DataSource, Repository } from 'typeorm';

const SORT_COLUMN: Record<ServiceSortField, string> = {
  name: 'service.name',
  categoryId: 'service.categoryId',
  categoryName: 'category.name',
  durationMin: 'service.durationMin',
  price: 'service.price',
  commissionPct: 'service.commissionPct',
  active: 'service.active',
};

export class TypeOrmServiceRepository implements IServiceRepository {
  private readonly repository: Repository<ServiceEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(ServiceEntity);
  }
  
  async findBySlug(slug: string): Promise<Service | null> {
    const entity = await this.repository.findOne({ where: { slug }, relations: { category: true } });

    return entity ? ServiceMapper.toDomain(entity) : null;
  }
  
  async findById(id: string): Promise<Service | null> {
    const entity = await this.repository.findOne({ where: { id }, relations: { category: true } });

    return entity ? ServiceMapper.toDomain(entity) : null;
  }

  async findPage(
    { search, categoryId, active, sortField, direction }: ServiceFilters,
    pagination: PaginationParams,
  ): Promise<{ items: Service[]; total: number }> {
    const qb = this.repository.createQueryBuilder('service').innerJoinAndSelect('service.category', 'category');

    if (search) {
      const escaped = search.toLowerCase().replace(/[\\%_]/g, '\\$&');
      qb.andWhere("LOWER(service.name) LIKE :search ESCAPE '\\'", { search: `%${escaped}%` });
    }
    if (categoryId !== undefined) qb.andWhere('service.categoryId = :categoryId', { categoryId });
    if (active !== undefined) qb.andWhere('service.active = :active', { active });

    // sortField vem de whitelist (SERVICE_SORT_FIELDS), validada no controller.
    const [entities, total] = await qb
      .orderBy(SORT_COLUMN[sortField], direction === 'desc' ? 'DESC' : 'ASC')
      .addOrderBy('service.id', 'ASC')
      .skip(getSkip(pagination))
      .take(pagination.limit)
      .getManyAndCount();

    return { items: entities.map(ServiceMapper.toDomain), total };
  }

  async updateActive(service: Service): Promise<void> {
    await this.repository.update({ id: service.id }, { active: service.active, updatedAt: service.updatedAt });
  }
  
  async create(service: Service, assignments: ServiceBarberAssignment[]): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(ServiceEntity, ServiceMapper.toPersistence(service));

        if (assignments.length) {
          await manager.insert(
            BarberServiceEntity,
            assignments.map(({ barberId, commissionPct }) => ({ barberId, serviceId: service.id, commissionPct })),
          );
        }
      });
    } catch (error) {
      throw this.translateConstraintError(error);
    }
  }

  private translateConstraintError(error: unknown): unknown {
    if (!(error instanceof QueryFailedError)) return error;

    const { code, message } = error.driverError as { code?: string; message?: string };
    if (code === 'SQLITE_CONSTRAINT_UNIQUE' && message?.includes('services.slug')) return new ServiceSlugAlreadyExistsError();

    return error;
  }
  
}
