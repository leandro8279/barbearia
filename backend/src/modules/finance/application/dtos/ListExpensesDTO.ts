import type { ExpenseResponseDTO } from '@/modules/finance/application/dtos/ExpenseResponseDTO';
import type { ExpenseFilters } from '@/modules/finance/domain/repositories/ExpenseRepositoryInterface';

export interface ListExpensesDTO extends Omit<ExpenseFilters, 'categories' | 'overdueBefore'> {
  page: number;
  pageSize: number;
  category?: string;
}

export interface ListExpensesResponseDTO {
  items: ExpenseResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
