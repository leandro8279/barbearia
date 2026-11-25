import { ListExpenseCategoriesResponseDTO, toListExpenseCategoriesResponse } from '@/modules/finance/application/dtos/ListExpenseCategoriesDTO';
import { EXPENSE_CATEGORIES } from '@/modules/finance/domain/entities/ExpenseCategory';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class ListExpenseCategoriesUseCase implements IUseCase<void, ListExpenseCategoriesResponseDTO> {
  async execute(): Promise<ListExpenseCategoriesResponseDTO> {
    return toListExpenseCategoriesResponse(EXPENSE_CATEGORIES);
  }
}
