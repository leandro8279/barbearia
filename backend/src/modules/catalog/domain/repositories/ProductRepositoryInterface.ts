import type { Product, ProductKind } from '@/modules/catalog/domain/entities/Product';

import type { PaginationParams } from '@/shared/types/pagination.types';

export const PRODUCT_SORT_FIELDS = ['name', 'sku', 'categoryId', 'price', 'costCents', 'stock'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export interface ProductFilters {
  search: string;
  categoryId?: string;
  kind?: ProductKind;
  stock?: 'low' | 'ok';
  sortField: ProductSortField;
  direction: 'asc' | 'desc';
}

export interface IProductRepository {
  findPage(filters: ProductFilters, pagination: PaginationParams): Promise<{ items: Product[]; total: number }>;
}
