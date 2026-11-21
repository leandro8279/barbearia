import { Product } from '@/modules/catalog/domain/entities/Product';
import { ProductEntity } from '@/modules/catalog/infra/entities/ProductEntity';
import { ProductCategoryMapper } from '@/modules/catalog/infra/mappers/ProductCategoryMapper';

export class ProductMapper {
  static toDomain(entity: ProductEntity): Product {
    return Product.restore({
      id: entity.id,
      sku: entity.sku,
      name: entity.name,
      category: ProductCategoryMapper.toDomain(entity.category),
      price: entity.price,
      costCents: entity.costCents,
      stock: entity.stock,
      minStock: entity.minStock,
      kind: entity.kind,
      commissionPct: entity.commissionPct,
      image: entity.image ?? '',
      active: entity.active,
    });
  }
  
  static toPersistence(product: Product): Omit<ProductEntity, 'category' | 'createdAt' | 'updatedAt'> {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    price: product.price,
    costCents: product.costCents,
    stock: product.stock,
    minStock: product.minStock,
    kind: product.kind,
    commissionPct: product.commissionPct,
    image: product.image,
    active: product.active,
  };
}
}
