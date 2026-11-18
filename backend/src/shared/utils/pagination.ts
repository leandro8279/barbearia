import { PaginatedResult, PaginationParams } from '@/shared/types/pagination.types';

export function getSkip({ page, limit }: PaginationParams): number {
  return (page - 1) * limit;
}

export function buildPaginatedResult<T>(data: T[], total: number, { page, limit }: PaginationParams): PaginatedResult<T> {
  return {
    data,
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
