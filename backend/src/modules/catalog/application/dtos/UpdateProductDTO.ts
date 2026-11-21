import type { ProductKind } from '@/modules/catalog/domain/entities/Product';

export interface UpdateProductDTO {
  id: string;
  actorId: string;
  sku?: string;
  name?: string;
  categoryId?: string;
  price?: number;
  costCents?: number;
  minStock?: number;
  commissionPct?: number;
  kind?: ProductKind;
  image?: string;
  active?: boolean;
}
