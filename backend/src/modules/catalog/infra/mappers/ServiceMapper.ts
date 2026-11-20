import { Service } from '@/modules/catalog/domain/entities/Service';
import { ServiceEntity } from '@/modules/catalog/infra/entities/ServiceEntity';
import { ServiceCategoryMapper } from '@/modules/catalog/infra/mappers/ServiceCategoryMapper';

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
  
static toPersistence(service: Service): Omit<ServiceEntity, 'category'> {
  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    categoryId: service.categoryId,
    description: service.description,
    image: service.image,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    price: service.price,
    commissionPct: service.commissionPct,
    active: service.active,
    featured: service.featured,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
 }
}
