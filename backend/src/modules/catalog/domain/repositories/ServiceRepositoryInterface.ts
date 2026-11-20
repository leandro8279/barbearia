import { PaginationParams } from '@/shared/types/pagination.types';

export const SERVICE_SORT_FIELDS = ['name', 'categoryId', 'durationMin', 'price', 'commissionPct', 'active'] as const;
export type ServiceSortField = (typeof SERVICE_SORT_FIELDS)[number];

export interface AdminServiceFilters {
  search: string;
  categoryId?: number;
  active?: boolean;
  sortField: ServiceSortField;
  direction: 'asc' | 'desc';
}

export interface AdminServiceItem {
  id: string;
  name: string;
  slug: string;
  categoryId: number;
  description: string;
  durationMin: number;
  bufferMin: number;
  price: number; // centavos
  commissionPct: number;
  active: boolean;
  featured: boolean;
}

export interface IServiceRepository {
  findAdminPage(filters: AdminServiceFilters, pagination: PaginationParams): Promise<{ items: AdminServiceItem[]; total: number }>;
}
