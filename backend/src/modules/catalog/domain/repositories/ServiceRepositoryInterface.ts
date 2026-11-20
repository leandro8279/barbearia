import type { Service } from '@/modules/catalog/domain/entities/Service';

import type { PaginationParams } from '@/shared/types/pagination.types';

export const SERVICE_SORT_FIELDS = ['name', 'categoryId', 'categoryName', 'durationMin', 'price', 'commissionPct', 'active'] as const;
export type ServiceSortField = (typeof SERVICE_SORT_FIELDS)[number];

export interface ServiceFilters {
  search: string;
  categoryId?: string;
  active?: boolean;
  sortField: ServiceSortField;
  direction: 'asc' | 'desc';
}

export interface IServiceRepository {
  findById(id: string): Promise<Service | null>;
  findPage(filters: ServiceFilters, pagination: PaginationParams): Promise<{ items: Service[]; total: number }>;
}
