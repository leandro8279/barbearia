import type { Expense } from '@/modules/finance/domain/entities/Expense';

import type { PaginationParams } from '@/shared/types/pagination.types';

export const EXPENSE_SORT_FIELDS = ['dueAt', 'description', 'category', 'amountCents', 'status'] as const;
export type ExpenseSortField = (typeof EXPENSE_SORT_FIELDS)[number];

export const EXPENSE_STATUS_FILTERS = ['all', 'open', 'paid', 'overdue'] as const;
export type ExpenseStatusFilter = (typeof EXPENSE_STATUS_FILTERS)[number];

export interface ExpenseFilters {
  search: string;
  categories?: string[];
  status: ExpenseStatusFilter;
  dueFrom?: Date;
  dueTo?: Date;
  overdueBefore: Date;
  sortField: ExpenseSortField;
  direction: 'asc' | 'desc';
}

export interface IExpenseRepository {
  findPage(filters: ExpenseFilters, pagination: PaginationParams): Promise<{ items: Expense[]; total: number }>;
}
