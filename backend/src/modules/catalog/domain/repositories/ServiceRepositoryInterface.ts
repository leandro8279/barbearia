import { PaginationParams } from '@/shared/types/pagination.types';

export const SERVICE_SORT_FIELDS = ['name', 'categoryId', 'durationMin', 'price', 'commissionPct', 'active'] as const;
export type ServiceSortField = (typeof SERVICE_SORT_FIELDS)[number];

export interface AdminServiceFilters {
  search: string;
  categoryId?: string;
  active?: boolean;
  sortField: ServiceSortField;
  direction: 'asc' | 'desc';
}

export interface AdminServiceItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  description: string;
  durationMin: number;
  bufferMin: number;
  price: number; // centavos
  commissionPct: number;
  active: boolean;
  featured: boolean;
}

export interface AdminServiceDetail extends AdminServiceItem {
  image: string;
}

export interface IServiceRepository {
  findAdminPage(filters: AdminServiceFilters, pagination: PaginationParams): Promise<{ items: AdminServiceItem[]; total: number }>;
  findAdminById(id: string): Promise<AdminServiceDetail | null>;
}
