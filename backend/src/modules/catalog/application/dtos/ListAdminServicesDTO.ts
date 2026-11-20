import type { AdminServiceFilters, AdminServiceItem } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

export interface ListAdminServicesDTO extends AdminServiceFilters {
  page: number;
  pageSize: number;
}

export interface ListAdminServicesResponseDTO {
  items: AdminServiceItem[];
  total: number;
  page: number;
  pageSize: number;
}
