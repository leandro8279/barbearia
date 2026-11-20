import { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';
import { ServiceCategoryEntity } from '@/modules/catalog/infra/entities/ServiceCategoryEntity';

export class ServiceCategoryMapper {
  static toDomain(entity: ServiceCategoryEntity): ServiceCategory {
    return ServiceCategory.restore({ id: entity.id, name: entity.name, slug: entity.slug, order: entity.order });
  }
}
