import type { ExpenseCategory } from '@/modules/finance/domain/entities/ExpenseCategory';

export interface ExpenseCategoryDTO {
  id: number;
  name: string;
  slug: string;
}

export type ListExpenseCategoriesResponseDTO = ExpenseCategoryDTO[];

export function toExpenseCategoryResponse({ id, name, slug }: ExpenseCategory): ExpenseCategoryDTO {
  return { id, name, slug };
}

export function toListExpenseCategoriesResponse(categories: readonly ExpenseCategory[]): ListExpenseCategoriesResponseDTO {
  return categories.map(toExpenseCategoryResponse);
}
