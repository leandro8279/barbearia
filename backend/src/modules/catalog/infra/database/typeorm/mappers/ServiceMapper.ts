import { Service } from '@/modules/catalog/domain/entities/Service';
import { ServiceEntity } from '@/modules/catalog/infra/database/typeorm/entities/ServiceEntity';
import { ServiceCategoryMapper } from '@/modules/catalog/infra/database/typeorm/mappers/ServiceCategoryMapper';

export class ServiceMapper {
  /** Exige `entity.category` carregada (join/relations). */
  static toDomain(entity: ServiceEntity): Service {
    return Service.restore({
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      category: ServiceCategoryMapper.toDomain(entity.category),
      description: entity.description ?? '',
      image: entity.image ?? '',
      durationMin: entity.durationMin,
      bufferMin: entity.bufferMin,
      price: entity.price,
      commissionPct: entity.commissionPct,
      active: entity.active,
      featured: entity.featured,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
