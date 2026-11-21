import type { ProductKind } from '@/modules/catalog/domain/entities/Product';

export interface CreateProductDTO {
  sku: string;
  name: string;
  categoryId: string;
  price: number;
  costCents: number;
  stock: number;
  minStock: number;
  kind: ProductKind;
  commissionPct: number;
  image: string;
  active: boolean;
  actorId: string;
}
