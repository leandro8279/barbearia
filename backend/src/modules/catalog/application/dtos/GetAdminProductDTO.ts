import type { Product, ProductKind } from '@/modules/catalog/domain/entities/Product';

export interface GetAdminProductDTO {
  id: string;
}

export interface GetAdminProductResponseDTO {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number; // centavos
  costCents: number;
  stock: number;
  minStock: number;
  kind: ProductKind;
  commissionPct: number;
  image: string;
  active: boolean;
}

export function toGetAdminProductResponse(product: Product): GetAdminProductResponseDTO {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: product.category.name,
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
