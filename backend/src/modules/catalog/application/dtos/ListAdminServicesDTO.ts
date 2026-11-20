import type { ServiceResponseDTO } from '@/modules/catalog/application/dtos/ServiceResponseDTO';
import type { ServiceFilters } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

export interface ListAdminServicesDTO extends ServiceFilters {
  page: number;
  pageSize: number;
}

export interface ListAdminServicesResponseDTO {
  items: ServiceResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
}
