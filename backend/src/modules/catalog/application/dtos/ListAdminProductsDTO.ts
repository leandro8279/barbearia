import type { ProductResponseDTO } from '@/modules/catalog/application/dtos/ProductResponseDTO';
import type { ProductFilters } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';

export interface ListAdminProductsDTO extends ProductFilters {
  page: number;
  pageSize: number;
}

export interface ListAdminProductsResponseDTO {
  items: ProductResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
}
