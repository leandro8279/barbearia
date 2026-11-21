import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';
import { ProductCategoryEntity } from '@/modules/catalog/infra/entities/ProductCategoryEntity';

export class ProductCategoryMapper {
  static toDomain(entity: ProductCategoryEntity): ProductCategory {
    return ProductCategory.restore({ id: entity.id, name: entity.name, slug: entity.slug });
  }
}
